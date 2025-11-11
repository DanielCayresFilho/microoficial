import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CloseConversationDto } from './dto/close-conversation.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
  ) {}

  async findAllConversations(status?: string, operatorId?: string) {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (operatorId) {
      where.operatorId = operatorId;
    }

    return this.prisma.conversation.findMany({
      where,
      include: {
        operator: true,
        number: true,
        tabulation: true,
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findConversationById(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        operator: true,
        number: {
          include: {
            account: true,
          },
        },
        tabulation: true,
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async sendMessage(conversationId: string, dto: SendMessageDto) {
    const conversation = await this.findConversationById(conversationId);

    if (conversation.status !== 'OPEN') {
      throw new BadRequestException('Cannot send message to closed conversation');
    }

    // Send message via WhatsApp
    try {
      const response = await this.whatsappService.sendTextMessage(
        conversation.number.phoneNumberId,
        conversation.number.account.accessToken,
        {
          to: conversation.customerPhone,
          text: dto.text,
          previewUrl: dto.previewUrl,
        },
      );

      const messageId = response.messages?.[0]?.id;

      // Save message to database
      const savedMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          numberId: conversation.numberId,
          messageId,
          wamid: messageId,
          direction: 'OUTBOUND',
          type: 'text',
          content: { text: dto.text },
          status: 'SENT',
          fromPhone: conversation.number.phoneNumber,
          toPhone: conversation.customerPhone,
        },
      });

      // Update conversation lastMessageAt
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      this.logger.log(`Message sent to conversation ${conversationId}: ${messageId}`);

      return savedMessage;
    } catch (error) {
      this.logger.error(
        `Failed to send message to conversation ${conversationId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async closeConversation(conversationId: string, dto: CloseConversationDto) {
    const conversation = await this.findConversationById(conversationId);

    if (conversation.status === 'CLOSED') {
      throw new BadRequestException('Conversation already closed');
    }

    // Validate tabulation exists
    const tabulation = await this.prisma.tabulation.findUnique({
      where: { id: dto.tabulationId },
    });

    if (!tabulation) {
      throw new NotFoundException('Tabulation not found');
    }

    // Check if notes are required
    if (tabulation.requiresNotes && !dto.notes) {
      throw new BadRequestException('Notes are required for this tabulation');
    }

    // Close conversation
    const closedConversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'CLOSED',
        tabulationId: dto.tabulationId,
        notes: dto.notes,
        closedAt: new Date(),
      },
      include: {
        operator: true,
        tabulation: true,
      },
    });

    this.logger.log(`Conversation ${conversationId} closed with tabulation: ${tabulation.name}`);

    return closedConversation;
  }

  async assignOperator(conversationId: string, operatorId: string) {
    const conversation = await this.findConversationById(conversationId);

    if (conversation.status !== 'OPEN') {
      throw new BadRequestException('Cannot assign operator to closed conversation');
    }

    // Verify operator exists and is active
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      include: {
        _count: {
          select: {
            conversations: {
              where: { status: 'OPEN' },
            },
          },
        },
      },
    });

    if (!operator) {
      throw new NotFoundException('Operator not found');
    }

    if (!operator.isActive) {
      throw new BadRequestException('Operator is not active');
    }

    // Check if operator is at max capacity
    if (operator._count.conversations >= operator.maxConcurrent) {
      throw new BadRequestException(
        `Operator is at max capacity (${operator.maxConcurrent} conversations)`,
      );
    }

    // Assign operator
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { operatorId },
      include: {
        operator: true,
      },
    });
  }

  async getConversationStats() {
    const [total, open, closed, unassigned] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.conversation.count({ where: { status: 'OPEN' } }),
      this.prisma.conversation.count({ where: { status: 'CLOSED' } }),
      this.prisma.conversation.count({
        where: { status: 'OPEN', operatorId: null },
      }),
    ]);

    return {
      total,
      open,
      closed,
      unassigned,
    };
  }
}
