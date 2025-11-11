import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly autoCloseHours: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.autoCloseHours = this.configService.get<number>(
      'CONVERSATION_AUTO_CLOSE_HOURS',
      24,
    );
  }

  /**
   * Auto-close conversations that haven't had activity in 24 hours
   * Runs every 10 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoCloseInactiveConversations() {
    this.logger.log('Running auto-close inactive conversations job');

    try {
      // Calculate cutoff time (24 hours ago by default)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - this.autoCloseHours);

      // Find conversations that are open and haven't had activity in 24h
      const inactiveConversations = await this.prisma.conversation.findMany({
        where: {
          status: 'OPEN',
          lastMessageAt: {
            lt: cutoffTime,
          },
        },
      });

      this.logger.log(
        `Found ${inactiveConversations.length} conversations to auto-close`,
      );

      if (inactiveConversations.length === 0) {
        return;
      }

      // Find or create "Auto-closed" tabulation
      let autoClosedTabulation = await this.prisma.tabulation.findFirst({
        where: { name: 'Fechada por Inatividade 24h' },
      });

      if (!autoClosedTabulation) {
        this.logger.log('Creating default auto-close tabulation');
        autoClosedTabulation = await this.prisma.tabulation.create({
          data: {
            name: 'Fechada por Inatividade 24h',
            description: 'Conversa fechada automaticamente após 24 horas de inatividade',
            requiresNotes: false,
            isActive: true,
          },
        });
      }

      // Close conversations
      const result = await this.prisma.conversation.updateMany({
        where: {
          id: {
            in: inactiveConversations.map((c) => c.id),
          },
        },
        data: {
          status: 'CLOSED',
          tabulationId: autoClosedTabulation.id,
          closedAt: new Date(),
          notes: `Conversa fechada automaticamente após ${this.autoCloseHours} horas de inatividade`,
        },
      });

      this.logger.log(`Auto-closed ${result.count} conversations`);
    } catch (error) {
      this.logger.error(
        `Error in auto-close job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update campaign status to COMPLETED when all messages are processed
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateCompletedCampaigns() {
    this.logger.log('Checking for completed campaigns');

    try {
      const processingCampaigns = await this.prisma.campaign.findMany({
        where: {
          status: 'PROCESSING',
        },
      });

      for (const campaign of processingCampaigns) {
        const totalProcessed = campaign.sentCount + campaign.failedCount;

        if (totalProcessed >= campaign.totalRecipients) {
          await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });

          this.logger.log(`Campaign ${campaign.id} marked as COMPLETED`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error updating completed campaigns: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Clean up old webhook events (older than 7 days)
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldWebhookEvents() {
    this.logger.log('Cleaning up old webhook events');

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await this.prisma.webhookEvent.deleteMany({
        where: {
          createdAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      this.logger.log(`Deleted ${result.count} old webhook events`);
    } catch (error) {
      this.logger.error(
        `Error cleaning up webhook events: ${error.message}`,
        error.stack,
      );
    }
  }
}
