import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
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

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
  ) {
    super();
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
      const number = await this.prisma.number.findUnique({
        where: { phoneNumberId },
      });

      if (!number) {
        this.logger.error(`Number with phoneNumberId ${phoneNumberId} not found`);
        throw new Error(`Number not found: ${phoneNumberId}`);
      }

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

      if (!conversation) {
        // NEW CONVERSATION - TRIGGER TRANSBORDO (DISTRIBUTION LOGIC)
        this.logger.log(`New conversation detected from ${from}, triggering transbordo`);
        isNewConversation = true;

        // Find operator with least active conversations (round-robin strategy)
        const operatorWithLeastConversations = await this.prisma.operator.findFirst({
          where: {
            isActive: true,
          },
          orderBy: {
            conversations: {
              _count: 'asc',
            },
          },
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
        });

        if (!operatorWithLeastConversations) {
          this.logger.warn('No active operators available, creating unassigned conversation');
        }

        // Check if operator is below max concurrent limit
        let assignedOperatorId: string | null = null;
        if (operatorWithLeastConversations) {
          const openCount = operatorWithLeastConversations._count.conversations;
          if (openCount < operatorWithLeastConversations.maxConcurrent) {
            assignedOperatorId = operatorWithLeastConversations.id;
          } else {
            this.logger.warn(
              `Operator ${operatorWithLeastConversations.name} is at max capacity (${openCount}/${operatorWithLeastConversations.maxConcurrent})`,
            );
          }
        }

        // Create new conversation
        conversation = await this.prisma.conversation.create({
          data: {
            customerPhone: from,
            customerName: name || from,
            numberId: number.id,
            operatorId: assignedOperatorId,
            status: 'OPEN',
            lastMessageAt: new Date(parseInt(timestamp) * 1000),
          },
          include: {
            operator: true,
          },
        });

        this.logger.log(
          `Created conversation ${conversation.id} for ${from}, assigned to operator: ${conversation.operator?.name || 'UNASSIGNED'}`,
        );
      } else {
        // Update last message timestamp
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(parseInt(timestamp) * 1000),
          },
        });
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
          timestamp: new Date(parseInt(timestamp) * 1000),
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
            },
            message: savedMessage,
          });
        } else {
          // Notify operator about new message in existing conversation
          this.eventsGateway.emitToOperator(conversation.operatorId, 'new_message', {
            conversationId: conversation.id,
            message: savedMessage,
          });
        }
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
