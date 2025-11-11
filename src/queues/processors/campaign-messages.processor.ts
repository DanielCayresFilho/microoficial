import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';

interface SendTemplateMessageJobData {
  campaignId: string;
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  languageCode: string;
  components?: any[];
  recipientData?: any;
}

@Processor(QUEUE_NAMES.CAMPAIGN_MESSAGES, {
  concurrency: 5,
  limiter: {
    max: 50,
    duration: 60000, // 50 messages per minute (default rate limit)
  },
})
export class CampaignMessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignMessagesProcessor.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
  ) {
    super();
  }

  async process(
    job: Job<SendTemplateMessageJobData>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { campaignId, phoneNumberId, accessToken, to, templateName, languageCode, components } = job.data;

    try {
      this.logger.debug(
        `Processing campaign message job ${job.id} for campaign ${campaignId} to ${to}`,
      );

      // Send template message via WhatsApp
      const response = await this.whatsappService.sendTemplateMessage(
        phoneNumberId,
        accessToken,
        {
          to,
          templateName,
          languageCode,
          components,
        },
      );

      const messageId = response.messages?.[0]?.id;

      // Save message to database
      await this.prisma.message.create({
        data: {
          numberId: job.data.phoneNumberId,
          messageId: messageId,
          wamid: messageId,
          direction: 'OUTBOUND',
          type: 'template',
          content: {
            templateName,
            languageCode,
            components,
            recipientData: job.data.recipientData,
          },
          status: 'SENT',
          fromPhone: '', // Will be filled from webhook
          toPhone: to,
          metadata: {
            campaignId,
            jobId: job.id,
          },
        },
      });

      // Update campaign stats
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
        },
      });

      this.logger.log(
        `Successfully sent campaign message ${messageId} to ${to}`,
      );

      return { success: true, messageId };
    } catch (error) {
      this.logger.error(
        `Failed to send campaign message to ${to}: ${error.message}`,
        error.stack,
      );

      // Update campaign failure count
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          failedCount: { increment: 1 },
        },
      });

      throw error; // BullMQ will retry based on job options
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Campaign message job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Campaign message job ${job.id} failed: ${error.message}`,
    );
  }
}
