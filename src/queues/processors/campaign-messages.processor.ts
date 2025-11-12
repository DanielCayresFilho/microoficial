import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { subHours, differenceInHours } from 'date-fns';
import {
  ConversationEventDirection,
  ConversationEventSource,
  ConversationEventType,
} from '@prisma/client';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';

interface SendTemplateMessageJobData {
  campaignId: string;
  campaignContactId: string;
  numberId: string;
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
    const {
      campaignId,
      campaignContactId,
      numberId,
      phoneNumberId,
      accessToken,
      to,
      templateName,
      languageCode,
      components,
    } = job.data;

    this.logger.debug(
      `Processing campaign message job ${job.id} for campaign ${campaignId} to ${to}`,
    );

    const now = new Date();
    const twentyFourHoursAgo = subHours(now, 24);

    const recentCampaignEvent = await this.prisma.conversationEvent.findFirst({
      where: {
        phoneNumber: to,
        source: ConversationEventSource.CAMPAIGN,
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const recentCpcEvent = await this.prisma.conversationEvent.findFirst({
      where: {
        phoneNumber: to,
        eventType: ConversationEventType.CPC,
        cpcMarked: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentCampaignEvent || (recentCpcEvent && differenceInHours(now, recentCpcEvent.createdAt) < 24)) {
      this.logger.debug(
        `Skipping campaign send to ${to} due to 24h restriction (campaignId=${campaignId})`,
      );

      if (campaignContactId) {
        await this.prisma.campaignContact.update({
          where: { id: campaignContactId },
          data: {
            status: 'SKIPPED_24H',
            lastAttemptAt: now,
            lastStatusAt: now,
            failedReason: recentCampaignEvent ? 'LIMIT_24H_CAMPAIGN' : 'LIMIT_24H_CPC',
            updatedAt: now,
          },
        });
      }

      return { success: true };
    }

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

      if (campaignContactId) {
        await this.prisma.campaignContact.update({
          where: { id: campaignContactId },
          data: {
            status: 'FAILED',
            lastAttemptAt: now,
            lastStatusAt: now,
            failedReason: error.message,
            updatedAt: now,
          },
        });
      }

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
          numberId,
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

      if (campaignContactId) {
        await this.prisma.campaignContact.update({
          where: { id: campaignContactId },
          data: {
            status: 'SENT',
            lastAttemptAt: now,
            lastSentAt: now,
            lastStatusAt: now,
            failedReason: null,
            updatedAt: now,
          },
        });
      }

      await this.prisma.conversationEvent.create({
        data: {
          campaignId,
          campaignContactId: campaignContactId ?? null,
          numberId,
          messageId,
          phoneNumber: to,
          source: ConversationEventSource.CAMPAIGN,
          direction: ConversationEventDirection.OUTBOUND,
          eventType: ConversationEventType.MESSAGE,
          payload: {
            templateName,
            languageCode,
            components,
          },
        },
      });
    } catch (persistError) {
      this.logger.error(
        `Campaign message ${messageId ?? 'unknown'} sent to ${to}, but failed to persist in database: ${persistError.message}`,
        persistError.stack,
      );

      if (campaignContactId) {
        await this.prisma.campaignContact.update({
          where: { id: campaignContactId },
          data: {
            status: 'SENT',
            lastAttemptAt: now,
            lastSentAt: now,
            lastStatusAt: now,
            updatedAt: now,
          },
        });
      }
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
