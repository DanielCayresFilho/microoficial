import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { PrismaService } from '../../prisma/prisma.service';

interface MessageStatusJobData {
  messageId: string;
  status: string; // sent, delivered, read, failed
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
  recipientId?: string;
}

@Processor(QUEUE_NAMES.MESSAGE_STATUS, {
  concurrency: 10,
})
export class MessageStatusProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageStatusProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<MessageStatusJobData>): Promise<void> {
    const { messageId, status, timestamp, errorCode, errorMessage } = job.data;

    try {
      this.logger.debug(`Processing status update for message ${messageId}: ${status}`);

      // Find message by messageId or wamid
      const message = await this.prisma.message.findFirst({
        where: {
          OR: [{ messageId }, { wamid: messageId }],
        },
        include: {
          conversation: {
            include: {
              number: true,
            },
          },
        },
      });

      if (!message) {
        this.logger.warn(`Message ${messageId} not found for status update`);
        return;
      }

      // Update message status
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: status.toUpperCase(),
          errorCode,
          errorMessage,
          updatedAt: new Date(),
        },
      });

      // Update campaign statistics if this is a campaign message
      const campaignId = (message.metadata as any)?.campaignId;
      if (campaignId) {
        if (status === 'delivered') {
          await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { deliveredCount: { increment: 1 } },
          });
        } else if (status === 'read') {
          await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { readCount: { increment: 1 } },
          });
        } else if (status === 'failed') {
          await this.prisma.campaign.update({
            where: { id: campaignId },
            data: {
              failedCount: { increment: 1 },
              sentCount: { decrement: 1 },
            },
          });
        }
      }

      this.logger.log(`Updated message ${messageId} status to ${status}`);
    } catch (error) {
      this.logger.error(
        `Failed to update message status for ${messageId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Message status job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Message status job ${job.id} failed: ${error.message}`);
  }
}
