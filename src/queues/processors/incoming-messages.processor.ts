import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConversationEventSource, ConversationEventDirection, ConversationEventType } from '@prisma/client';
import { QUEUE_NAMES } from '../queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';

interface IncomingMessageJobData {
  messageId: string;
  wamid: string;
  from: string;
  to: string;
  phoneNumberId: string;
  type: string;
  content: any;
  timestamp: string;
  name?: string;
}

@Processor(QUEUE_NAMES.INCOMING_MESSAGES, {
  concurrency: 10,
})
export class IncomingMessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(IncomingMessagesProcessor.name);
  private readonly assignmentWindowMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
  ) {
    super();
  }

  private parseTimestamp(timestamp: string): Date {
    if (!timestamp) {
      return new Date();
    }

    const numeric = Number.parseInt(timestamp, 10);
    if (!Number.isNaN(numeric)) {
      // Meta timestamps are seconds
      return new Date(numeric * 1000);
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return new Date();
    }

    return date;
  }

  private segmentsMatch(
    operatorSegments: string[] | null | undefined,
    targetSegments: string[] | null | undefined,
  ): boolean {
    const operatorList = operatorSegments ?? [];
    const targetList = targetSegments ?? [];

    if (targetList.length === 0) {
      return true;
    }

    if (operatorList.length === 0) {
      return true;
    }

    return operatorList.some((segment) => targetList.includes(segment));
  }

  async process(job: Job<IncomingMessageJobData>): Promise<void> {
    const { messageId, wamid, from, to, phoneNumberId, type, content, timestamp, name } = job.data;

    try {
      this.logger.debug(`Processing incoming message ${messageId} from ${from}`);

      // Check if message already exists (deduplication)
      const existingMessage = await this.prisma.message.findFirst({
        where: {
          OR: [{ messageId }, { wamid }],
        },
      });

      if (existingMessage) {
        this.logger.warn(`Message ${messageId} already processed, skipping`);
        return;
      }

      // Get the number record
      let number = await this.prisma.number.findUnique({
        where: { phoneNumberId },
      });

      if (!number) {
        number = await this.prisma.number.findFirst({
          where: { phoneNumber: to },
        });
        if (number && !number.phoneNumberId) {
          await this.prisma.number.update({
            where: { id: number.id },
            data: { phoneNumberId },
          });
        }
      }

      if (!number) {
        this.logger.error(`Number with phoneNumberId ${phoneNumberId} not found and no fallback by phone ${to}`);
        // Acknowledge job without crashing to avoid endless retries
        return;
      }

      const messageDate = this.parseTimestamp(timestamp);
      const now = new Date();

      // Find or create conversation (TRANSBORDO LOGIC)
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          customerPhone: from,
          numberId: number.id,
          status: 'OPEN',
        },
        include: {
          operator: true,
        },
      });

      let isNewConversation = false;
      let operatorChanged = false;
      let assignedOperatorId: string | null = conversation?.operatorId ?? null;

      if (conversation?.operatorId) {
        const withinWindow =
          conversation.lastAssignedAt &&
          now.getTime() - conversation.lastAssignedAt.getTime() < this.assignmentWindowMs;

        const operatorPresence = await this.prisma.operatorPresence.findUnique({
          where: { operatorId: conversation.operatorId },
        });

        if (!withinWindow || !operatorPresence?.isOnline) {
          this.logger.log(
            `Releasing conversation ${conversation.id} from operator ${conversation.operatorId} (windowExpired=${!withinWindow}, operatorOnline=${operatorPresence?.isOnline})`,
          );
          assignedOperatorId = null;
          operatorChanged = true;
        } else {
          await this.prisma.operatorPresence.update({
            where: { operatorId: conversation.operatorId },
            data: {
              lastAssignedAt: now,
            },
          });
        }
      }

      if (!conversation) {
        // NEW CONVERSATION - TRIGGER TRANSBORDO (DISTRIBUTION LOGIC)
        this.logger.log(`New conversation detected from ${from}, triggering transbordo`);
        isNewConversation = true;
      }

      if (!assignedOperatorId) {
        const presences = await this.prisma.operatorPresence.findMany({
          where: {
            isOnline: true,
          },
          include: {
            operator: {
              include: {
                _count: {
                  select: {
                    conversations: {
                      where: {
                        status: 'OPEN',
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { lastAssignedAt: 'asc' },
            { startedAt: 'asc' },
          ],
        });

        const candidate = presences.find((presence) => {
          if (!presence.operator || !presence.operator.isActive) {
            return false;
          }

          const queueMatches =
            !number.queueKey ||
            !presence.queueKey ||
            presence.queueKey === number.queueKey;

          if (!queueMatches) {
            return false;
          }

          const numberMatches =
            !presence.numberId || presence.numberId === number.id;

          if (!numberMatches) {
            return false;
          }

          const segmentsMatch = this.segmentsMatch(
            presence.segments,
            number.segments,
          );

          if (!segmentsMatch) {
            return false;
          }

          const openCount =
            presence.operator._count?.conversations ?? 0;

          return (
            openCount < presence.operator.maxConcurrent
          );
        });

        if (candidate) {
          assignedOperatorId = candidate.operatorId;
          await this.prisma.operatorPresence.update({
            where: { operatorId: candidate.operatorId },
            data: {
              lastAssignedAt: now,
              lastHeartbeat: now,
            },
          });

          if (conversation && conversation.operatorId !== candidate.operatorId) {
            operatorChanged = true;
          }
        } else {
          this.logger.warn('No active operators available, creating unassigned conversation');
        }
      }

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            customerPhone: from,
            customerName: name || from,
            numberId: number.id,
            operatorId: assignedOperatorId,
            status: 'OPEN',
            lastMessageAt: messageDate,
            lastAssignedAt: assignedOperatorId ? now : null,
            lastCustomerMessageAt: messageDate,
            manualAttemptsCount: 0,
            manualAttemptsWindowStart: null,
            manualBlockedUntil: null,
          },
          include: {
            operator: true,
          },
        });

        this.logger.log(
          `Created conversation ${conversation.id} for ${from}, assigned to operator: ${conversation.operator?.name || 'UNASSIGNED'}`,
        );
      } else {
        conversation = await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: messageDate,
            operatorId: assignedOperatorId,
            lastAssignedAt: assignedOperatorId ? now : null,
            lastCustomerMessageAt: messageDate,
            manualAttemptsCount: 0,
            manualAttemptsWindowStart: null,
            manualBlockedUntil: null,
          },
          include: {
            operator: true,
          },
        });

        if (operatorChanged) {
          this.logger.log(
            `Conversation ${conversation.id} reassigned to operator ${conversation.operator?.name || 'UNASSIGNED'}`,
          );
        }
      }

      if (assignedOperatorId && operatorChanged) {
        isNewConversation = true;
      }

      // Save message to database
      const savedMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          numberId: number.id,
          messageId,
          wamid,
          direction: 'INBOUND',
          type,
          content,
          fromPhone: from,
          toPhone: to,
          timestamp: messageDate,
        },
      });

      await this.prisma.conversationEvent.create({
        data: {
          conversationId: conversation.id,
          messageId: savedMessage.id,
          campaignId: null,
          campaignContactId: null,
          numberId: number.id,
          operatorId: conversation.operatorId,
          phoneNumber: conversation.customerPhone,
          source: ConversationEventSource.CUSTOMER,
          direction: ConversationEventDirection.INBOUND,
          eventType: ConversationEventType.MESSAGE,
          payload: {
            type,
          },
        },
      });

      this.logger.log(`Saved incoming message ${messageId} to conversation ${conversation.id}`);

      // Emit WebSocket event to operator
      if (conversation.operatorId) {
        if (isNewConversation) {
          // Notify operator about new conversation
          this.eventsGateway.emitToOperator(conversation.operatorId, 'new_conversation', {
            conversation: {
              id: conversation.id,
              customerPhone: conversation.customerPhone,
              customerName: conversation.customerName,
              status: conversation.status,
              createdAt: conversation.createdAt,
              lastAssignedAt: conversation.lastAssignedAt,
              operatorId: conversation.operatorId,
            },
            message: savedMessage,
          });
        } else {
          // Notify operator about new message in existing conversation
          this.eventsGateway.emitToOperator(conversation.operatorId, 'new_message', {
            conversationId: conversation.id,
            operatorId: conversation.operatorId,
            message: savedMessage,
          });
        }
      } else {
        this.eventsGateway.emitToAllOperators('conversation:unassigned', {
          conversationId: conversation.id,
          message: savedMessage,
        });
      }

      this.logger.debug(`Successfully processed incoming message ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process incoming message ${messageId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Incoming message job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Incoming message job ${job.id} failed: ${error.message}`);
  }
}
