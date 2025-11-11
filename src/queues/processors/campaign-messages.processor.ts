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

    this.logger.debug(
      `Processing campaign message job ${job.id} for campaign ${campaignId} to ${to}`,
    );

    let messageId: string | undefined;

    try {
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
      messageId = response.messages?.[0]?.id;
    } catch (error) {
      this.logger.error(
        `Failed to send campaign message to ${to}: ${error.message}`,
        error.stack,
      );

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          failedCount: { increment: 1 },
        },
      });

      throw error;
    }

    try {
      await this.prisma.message.create({
        data: {
          numberId: job.data.phoneNumberId,
          messageId,
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
          fromPhone: '',
          toPhone: to,
          metadata: {
            campaignId,
            jobId: job.id,
          },
        },
      });
    } catch (persistError) {
      this.logger.error(
        `Campaign message ${messageId ?? 'unknown'} sent to ${to}, but failed to persist in database: ${persistError.message}`,
        persistError.stack,
      );
    }

    try {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
        },
      });
    } catch (statsError) {
      this.logger.error(
        `Failed to update stats for campaign ${campaignId}: ${statsError.message}`,
        statsError.stack,
      );
    }

    this.logger.log(
      `Successfully sent campaign message ${messageId ?? 'unknown'} to ${to}`,
    );

    return { success: true, messageId };
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
