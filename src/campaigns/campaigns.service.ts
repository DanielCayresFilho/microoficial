import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { QUEUE_NAMES, JOB_NAMES } from '../queues/queue.constants';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import csvParser from 'csv-parser';
import * as path from 'path';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.CAMPAIGN_MESSAGES) private campaignQueue: Queue,
  ) {}

  private async removeCampaignJobs(campaignId: string) {
    const jobs = await this.campaignQueue.getJobs(['waiting', 'delayed', 'active']);

    for (const job of jobs) {
      if (job?.data?.campaignId === campaignId) {
        try {
          await job.remove();
        } catch (error) {
          this.logger.warn(
            `Failed to remove job ${job.id} for campaign ${campaignId}: ${error.message}`,
          );
        }
      }
    }
  }

  async createCampaign(dto: CreateCampaignDto) {
    // Validate template exists
    const template = await this.prisma.template.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Validate account exists
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Validate number exists
    const number = await this.prisma.number.findUnique({
      where: { id: dto.numberId },
    });

    if (!number) {
      throw new NotFoundException('Number not found');
    }

    if (number.accountId !== dto.accountId) {
      throw new BadRequestException('Selected number does not belong to the provided account');
    }

    if (template.numberId && template.numberId !== dto.numberId) {
      throw new BadRequestException('Template is not linked to the selected number');
    }

    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        templateId: dto.templateId,
        accountId: dto.accountId,
        numberId: dto.numberId,
        csvFilePath: '', // Will be updated after CSV upload
        rateLimit: dto.rateLimit || 50,
        status: 'PENDING',
        queueKey: dto.queueKey ?? number.queueKey ?? null,
        originUrl: dto.originUrl ?? null,
        segments: dto.segments ?? number.segments ?? [],
      },
      include: {
        template: true,
        account: true,
        number: true,
      },
    });
  }

  async uploadCsvAndStartCampaign(campaignId: string, csvFilePath: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
        account: true,
        number: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'PENDING') {
      throw new BadRequestException('Campaign already started or completed');
    }

    // Update campaign with CSV path
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        csvFilePath,
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    this.logger.log(`Starting campaign ${campaignId} with CSV: ${csvFilePath}`);

    // Parse CSV and enqueue jobs
    await this.processCsvAndEnqueueJobs(campaign, csvFilePath);

    return { message: 'Campaign started successfully' };
  }

  async pauseCampaign(campaignId: string) {
    const campaign = await this.findCampaignById(campaignId);

    if (campaign.status !== 'PROCESSING') {
      throw new BadRequestException('Only campaigns in processing state can be paused');
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    await this.campaignQueue.pause();

    return { id: campaignId, status: 'PAUSED' };
  }

  async resumeCampaign(campaignId: string) {
    const campaign = await this.findCampaignById(campaignId);

    if (campaign.status !== 'PAUSED') {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PROCESSING' },
    });

    await this.campaignQueue.resume();

    return { id: campaignId, status: 'PROCESSING' };
  }

  async deleteCampaign(campaignId: string) {
    const campaign = await this.findCampaignById(campaignId);

    await this.removeCampaignJobs(campaignId);

    if (campaign.csvFilePath) {
      try {
        await fsp.unlink(campaign.csvFilePath);
      } catch (error) {
        this.logger.warn(`Failed to remove CSV file for campaign ${campaignId}: ${error.message}`);
      }
    }

    await this.prisma.campaign.delete({
      where: { id: campaignId },
    });

    return { message: 'Campaign deleted successfully', id: campaignId };
  }

  private async processCsvAndEnqueueJobs(campaign: any, csvFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let recipientCount = 0;

      fs.createReadStream(csvFilePath)
        .pipe(csvParser())
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', async () => {
          try {
            this.logger.log(`Parsed ${results.length} recipients from CSV`);

            // Update total recipients
            await this.prisma.campaign.update({
              where: { id: campaign.id },
              data: { totalRecipients: results.length },
            });

            // Enqueue jobs with rate limiting
            const jobs = [];

            for (let index = 0; index < results.length; index += 1) {
              const row = results[index];
              const phoneNumber = this.extractPhoneNumber(row);
              if (!phoneNumber) {
                this.logger.warn(`Skipping row ${index}: no phone number found`);
                continue;
              }

              const contact = await this.prisma.campaignContact.upsert({
                where: {
                  campaignId_phoneNumber: {
                    campaignId: campaign.id,
                    phoneNumber,
                  },
                },
                update: {
                  rawPayload: row,
                  updatedAt: new Date(),
                },
                create: {
                  campaignId: campaign.id,
                  phoneNumber,
                  rawPayload: row,
                },
              });

              const components = this.buildTemplateComponents(campaign.template, row);

              jobs.push({
                name: JOB_NAMES.SEND_TEMPLATE_MESSAGE,
                data: {
                  campaignId: campaign.id,
                  campaignContactId: contact.id,
                  numberId: campaign.number.id,
                  phoneNumberId: campaign.number.phoneNumberId,
                  accessToken: campaign.account.accessToken,
                  to: phoneNumber,
                  templateName: campaign.template.name,
                  languageCode: campaign.template.language,
                  components,
                  recipientData: row,
                },
                opts: {
                  delay: this.calculateDelay(index, campaign.rateLimit),
                },
              });
            }

            // Bulk add jobs to queue
            await this.campaignQueue.addBulk(jobs);

            this.logger.log(`Enqueued ${jobs.length} jobs for campaign ${campaign.id}`);
            resolve();
          } catch (error) {
            this.logger.error(`Error processing CSV: ${error.message}`, error.stack);

            // Update campaign status to FAILED
            await this.prisma.campaign.update({
              where: { id: campaign.id },
              data: { status: 'FAILED' },
            });

            reject(error);
          }
        })
        .on('error', async (error) => {
          this.logger.error(`Error reading CSV: ${error.message}`, error.stack);

          await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'FAILED' },
          });

          reject(error);
        });
    });
  }

  private extractPhoneNumber(row: any): string | null {
    // Try common column names
    const phoneFields = ['phone', 'phoneNumber', 'phone_number', 'telefone', 'celular', 'whatsapp'];

    for (const field of phoneFields) {
      if (row[field]) {
        return this.normalizePhoneNumber(row[field]);
      }
    }

    // If not found, try first column
    const firstValue = Object.values(row)[0];
    if (firstValue && typeof firstValue === 'string') {
      return this.normalizePhoneNumber(firstValue);
    }

    return null;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Add country code if missing (assuming Brazil +55)
    if (!cleaned.startsWith('55') && cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }

  private buildTemplateComponents(template: any, row: any): any[] {
    if (!template.variables || template.variables.length === 0) {
      return [];
    }

    // Build body component with variables
    const bodyParameters = template.variables.map((varName: string) => {
      // Try to find the value in the row
      const value = row[varName] || row[varName.toLowerCase()] || '';
      return {
        type: 'text',
        text: value.toString(),
      };
    });

    return [
      {
        type: 'body',
        parameters: bodyParameters,
      },
    ];
  }

  private calculateDelay(index: number, rateLimit: number): number {
    // Calculate delay to respect rate limit (messages per minute)
    const delayPerMessage = (60 * 1000) / rateLimit; // milliseconds
    return Math.floor(index * delayPerMessage);
  }

  async findAllCampaigns() {
    return this.prisma.campaign.findMany({
      include: {
        template: true,
        account: true,
        number: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCampaignById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        template: true,
        account: true,
        number: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async getCampaignStats(id: string) {
    const campaign = await this.findCampaignById(id);

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      totalRecipients: campaign.totalRecipients,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      readCount: campaign.readCount,
      failedCount: campaign.failedCount,
      progress: campaign.totalRecipients > 0
        ? ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100
        : 0,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
    };
  }
}
