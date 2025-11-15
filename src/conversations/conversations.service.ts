import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { addHours, differenceInHours, isAfter } from 'date-fns';
import {
  CampaignContact,
  ConversationEventDirection,
  ConversationEventSource,
  ConversationEventType,
  Conversation,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EventsGateway } from '../events/events.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import { CloseConversationDto } from './dto/close-conversation.dto';
import { SetCpcStatusDto } from './dto/set-cpc-status.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

type CustomerProfileRecord = Pick<
  CampaignContact,
  'phoneNumber' | 'customerName' | 'contractCode' | 'customerCpf' | 'rawPayload' | 'updatedAt'
>;

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  private static readonly MANUAL_ATTEMPT_LIMIT = 2;
  private static readonly MANUAL_BLOCK_WINDOW_HOURS = 3;
  private static readonly MANUAL_ATTEMPT_WINDOW_HOURS = 24;

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
  ) {}

  private computeEligibility(conversation: Conversation, now: Date) {
    let attemptsCount = conversation.manualAttemptsCount ?? 0;
    let windowStart = conversation.manualAttemptsWindowStart ?? null;

    if (windowStart) {
      const hours = differenceInHours(now, windowStart);
      if (hours >= ConversationsService.MANUAL_ATTEMPT_WINDOW_HOURS) {
        attemptsCount = 0;
        windowStart = null;
      }
    }

    // Check if last message was from customer
    const lastCustomerMessageAt = conversation.lastCustomerMessageAt;
    const lastAgentMessageAt = conversation.lastAgentMessageAt;
    const blockedUntil = conversation.manualBlockedUntil;
    
    // If blockedUntil is null and customer sent a message, it means customer replied and blocking was reset
    // Also check if lastCustomerMessageAt is more recent than lastAgentMessageAt
    const customerReplied = lastCustomerMessageAt && (
      !blockedUntil || 
      !lastAgentMessageAt || 
      isAfter(lastCustomerMessageAt, lastAgentMessageAt)
    );

    // If customer replied, reset blocking and attempts
    if (customerReplied) {
      attemptsCount = 0;
      windowStart = null;
    }

    // Only block by time if customer hasn't replied and blockedUntil is in the future
    const isBlockedByTime = !customerReplied && blockedUntil ? isAfter(blockedUntil, now) : false;
    const limitReached = attemptsCount >= ConversationsService.MANUAL_ATTEMPT_LIMIT;

    // Allow sending if customer replied, even if limit was reached
    const canSend = !isBlockedByTime && (customerReplied || !limitReached);

    return {
      canSend,
      attemptsCount: customerReplied ? 0 : attemptsCount,
      attemptsLimit: ConversationsService.MANUAL_ATTEMPT_LIMIT,
      blockedUntil: customerReplied ? null : blockedUntil,
      limitReached: customerReplied ? false : limitReached,
      isBlockedByTime,
      windowStart: customerReplied ? null : windowStart,
      lastAgentMessageAt: conversation.lastAgentMessageAt,
      lastCustomerMessageAt: conversation.lastCustomerMessageAt,
      cpcMarkedAt: conversation.cpcMarkedAt,
      lastMessageFromCustomer: !!customerReplied,
    };
  }

  private normalizeLookupPhone(phone?: string | null): string | null {
    if (!phone) {
      return null;
    }
    const digits = phone.replace(/\D/g, '');
    return digits.length ? digits : null;
  }

  private async loadCustomerProfilesByPhones(
    phones: string[],
  ): Promise<Map<string, CustomerProfileRecord>> {
    const normalizedPhones = Array.from(
      new Set(
        phones
          .map((phone) => this.normalizeLookupPhone(phone))
          .filter((value): value is string => !!value),
      ),
    );

    if (normalizedPhones.length === 0) {
      return new Map();
    }

    const contacts = await this.prisma.campaignContact.findMany({
      where: { phoneNumber: { in: normalizedPhones } },
      select: {
        phoneNumber: true,
        customerName: true,
        contractCode: true,
        customerCpf: true,
        rawPayload: true,
        updatedAt: true,
      },
    });

    const map = new Map<string, CustomerProfileRecord>();
    contacts.forEach((contact) => {
      map.set(contact.phoneNumber, contact);
    });

    return map;
  }

  private serializeCustomerProfile(record?: CustomerProfileRecord | null) {
    if (!record) {
      return null;
    }

    return {
      name: record.customerName,
      contract: record.contractCode,
      cpf: record.customerCpf,
      lastUpdatedAt: record.updatedAt,
      rawPayload: record.rawPayload,
      source: 'CAMPAIGN' as const,
    };
  }

  private buildCustomerProfile(conversation: Conversation, record?: CustomerProfileRecord | null) {
    const campaignProfile = this.serializeCustomerProfile(record);
    const hasManualData =
      Boolean(conversation.customerName) ||
      Boolean(conversation.customerContract) ||
      Boolean(conversation.customerCpf);

    if (!hasManualData) {
      return campaignProfile;
    }

    return {
      name: conversation.customerName ?? campaignProfile?.name ?? null,
      contract: conversation.customerContract ?? campaignProfile?.contract ?? null,
      cpf: conversation.customerCpf ?? campaignProfile?.cpf ?? null,
      lastUpdatedAt: conversation.updatedAt,
      rawPayload: campaignProfile?.rawPayload ?? null,
      source: 'MANUAL' as const,
    };
  }

  private async registerEvent(data: {
    conversationId?: string;
    messageId?: string;
    campaignId?: string;
    campaignContactId?: string;
    numberId?: string;
    operatorId?: string;
    phoneNumber: string;
    source: ConversationEventSource;
    direction: ConversationEventDirection;
    eventType: ConversationEventType;
    payload?: Record<string, any>;
    cpcMarked?: boolean;
    tabulationId?: string;
  }) {
    try {
      const eventData: any = {
        phoneNumber: data.phoneNumber,
        source: data.source,
        direction: data.direction,
        eventType: data.eventType,
        cpcMarked: data.cpcMarked ?? false,
      };

      if (data.conversationId) eventData.conversationId = data.conversationId;
      if (data.messageId) eventData.messageId = data.messageId;
      if (data.campaignId) eventData.campaignId = data.campaignId;
      if (data.campaignContactId) eventData.campaignContactId = data.campaignContactId;
      if (data.numberId) eventData.numberId = data.numberId;
      if (data.operatorId) eventData.operatorId = data.operatorId;
      if (data.payload) eventData.payload = data.payload;
      if (data.tabulationId) eventData.tabulationId = data.tabulationId;

      await this.prisma.conversationEvent.create({
        data: eventData,
      });
    } catch (error) {
      this.logger.warn(`Failed to register conversation event: ${error.message}`);
    }
  }

  async findAllConversations(status?: string, operatorId?: string) {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (operatorId) {
      where.operatorId = operatorId;
    }

    const conversations = await this.prisma.conversation.findMany({
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

    const profileMap = await this.loadCustomerProfilesByPhones(
      conversations.map((conversation) => conversation.customerPhone),
    );
    const now = new Date();

    return conversations.map((conversation) => {
      const normalizedPhone = this.normalizeLookupPhone(conversation.customerPhone);
      const profileRecord = normalizedPhone ? profileMap.get(normalizedPhone) ?? null : null;

      return {
        ...conversation,
        customerProfile: this.buildCustomerProfile(conversation, profileRecord),
        eligibility: this.computeEligibility(conversation, now),
      };
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

    const profileMap = await this.loadCustomerProfilesByPhones([conversation.customerPhone]);
    const normalizedPhone = this.normalizeLookupPhone(conversation.customerPhone);
    const now = new Date();
    return {
      ...conversation,
      customerProfile: this.buildCustomerProfile(
        conversation,
        normalizedPhone ? profileMap.get(normalizedPhone) ?? null : null,
      ),
      eligibility: this.computeEligibility(conversation, now),
    };
  }

  async updateCustomerProfile(
    conversationId: string,
    dto: UpdateCustomerProfileDto,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const data: any = {};

    if (dto.name !== undefined) {
      data.customerName = dto.name?.trim() ? dto.name.trim() : null;
    }

    if (dto.contract !== undefined) {
      data.customerContract = dto.contract?.trim() ? dto.contract.trim() : null;
    }

    if (dto.cpf !== undefined) {
      const digits = dto.cpf ? dto.cpf.replace(/\D/g, '') : '';
      if (digits && digits.length !== 11) {
        throw new BadRequestException('CPF inválido. Utilize 11 dígitos.');
      }
      data.customerCpf = digits || null;
    }

    if (Object.keys(data).length === 0) {
      return this.findConversationById(conversationId);
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data,
    });

    return this.findConversationById(conversationId);
  }

  async sendMessage(conversationId: string, dto: SendMessageDto) {
    const conversation = await this.findConversationById(conversationId);

    if (conversation.status !== 'OPEN') {
      throw new BadRequestException('Cannot send message to closed conversation');
    }

    const now = new Date();
    const eligibility = this.computeEligibility(conversation as Conversation, now);

    if (!eligibility.canSend) {
      if (eligibility.isBlockedByTime && eligibility.blockedUntil) {
        const hoursUntil = Math.ceil(
          differenceInHours(eligibility.blockedUntil, now)
        );
        throw new BadRequestException(
          `Aguarde o cliente responder. Caso não responda em até ${hoursUntil} hora(s), você poderá enviar uma nova mensagem.`,
        );
      }

      if (eligibility.limitReached) {
        throw new BadRequestException(
          'Você já atingiu o limite de repescagens. Aguarde o cliente responder para poder enviar novas mensagens. Caso não responda em até 3 horas, você poderá tentar novamente.',
        );
      }

      throw new BadRequestException(
        'Não é possível enviar mensagem no momento. Aguarde o cliente responder ou tente novamente mais tarde.',
      );
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
      const manualAttemptsCount = eligibility.limitReached
        ? ConversationsService.MANUAL_ATTEMPT_LIMIT
        : eligibility.attemptsCount;
      const updatedAttempts = manualAttemptsCount + 1;
      const manualWindowStart =
        eligibility.windowStart ?? now;

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: now,
          lastAssignedAt: now,
          lastAgentMessageAt: now,
          manualAttemptsCount: updatedAttempts,
          manualAttemptsWindowStart: manualWindowStart,
          manualBlockedUntil: addHours(now, ConversationsService.MANUAL_BLOCK_WINDOW_HOURS),
        },
      });

      if (conversation.operatorId) {
        await this.prisma.operatorPresence.updateMany({
          where: { operatorId: conversation.operatorId },
          data: { lastAssignedAt: now },
        });
      }

      await this.registerEvent({
        conversationId: conversation.id,
        messageId: savedMessage.id,
        numberId: conversation.numberId,
        operatorId: dto.operatorId ?? conversation.operatorId ?? undefined,
        phoneNumber: conversation.customerPhone,
        source: ConversationEventSource.OPERATOR,
        direction: ConversationEventDirection.OUTBOUND,
        eventType: ConversationEventType.MESSAGE,
        payload: {
          text: dto.text,
        },
      });

      // Emit WebSocket event to operator with message (including direction field)
      // Garante que o campo direction está sempre presente e correto
      const messageWithDirection = {
        ...savedMessage,
        direction: 'OUTBOUND', // Garante que sempre tenha direction: OUTBOUND
      };

      if (conversation.operatorId) {
        this.eventsGateway.emitToOperator(conversation.operatorId, 'new_message', {
          conversationId: conversation.id,
          operatorId: conversation.operatorId,
          message: messageWithDirection,
        });
        this.logger.debug(`Emitted new_message event to operator ${conversation.operatorId} for message ${messageId}`);
      }

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

    await this.registerEvent({
      conversationId,
      phoneNumber: closedConversation.customerPhone,
      numberId: closedConversation.numberId,
      operatorId: closedConversation.operatorId ?? undefined,
      source: ConversationEventSource.OPERATOR,
      direction: ConversationEventDirection.NONE,
      eventType: ConversationEventType.TABULATION,
      tabulationId: dto.tabulationId,
      payload: dto.notes
        ? {
            notes: dto.notes,
          }
        : undefined,
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
    const now = new Date();

    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        operatorId,
        lastAssignedAt: now,
      },
      include: {
        operator: true,
      },
    });

    await this.prisma.operatorPresence.updateMany({
      where: { operatorId },
      data: { lastAssignedAt: now },
    });

    return updatedConversation;
  }

  async setCpcStatus(conversationId: string, dto: SetCpcStatusDto) {
    const conversation = await this.findConversationById(conversationId);

    const now = new Date();

    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        cpcMarkedAt: dto.value ? now : null,
        cpcMarkedBy: dto.value ? dto.operatorId ?? conversation.operatorId ?? null : null,
      },
    });

    // Update related campaign contacts
    await this.prisma.campaignContact.updateMany({
      where: {
        phoneNumber: conversation.customerPhone,
      },
      data: {
        cpcMarkedAt: dto.value ? now : null,
        updatedAt: now,
      },
    });

    await this.registerEvent({
      conversationId,
      phoneNumber: conversation.customerPhone,
      numberId: conversation.numberId,
      operatorId: dto.operatorId ?? conversation.operatorId ?? undefined,
      source: ConversationEventSource.OPERATOR,
      direction: ConversationEventDirection.NONE,
      eventType: ConversationEventType.CPC,
      cpcMarked: dto.value,
    });

    return {
      ...updatedConversation,
      eligibility: this.computeEligibility(updatedConversation, now),
    };
  }

  async getConversationEligibility(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.computeEligibility(conversation, new Date());
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
