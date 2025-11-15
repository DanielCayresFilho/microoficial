import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

interface DateRangeParams {
  dateFrom?: string;
  dateTo?: string;
}

interface OperatorsReportParams extends DateRangeParams {
  operatorId?: string;
}

interface ConversationsReportParams extends DateRangeParams {
  operatorId?: string;
  status?: string;
  tabulationId?: string;
}

interface ConversationsByPeriodParams extends DateRangeParams {
  groupBy: 'day' | 'week' | 'month';
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private buildDateFilter(dateFrom?: string, dateTo?: string) {
    const filter: any = {};

    if (dateFrom) {
      filter.gte = startOfDay(parseISO(dateFrom));
    }

    if (dateTo) {
      filter.lte = endOfDay(parseISO(dateTo));
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  async getOperatorsReport(params: OperatorsReportParams) {
    const { dateFrom, dateTo, operatorId } = params;

    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const where: any = {};

    if (operatorId) {
      where.operatorId = operatorId;
    }

    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    // Buscar todas as conversas
    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        operator: true,
        tabulation: true,
        messages: {
          where: {
            direction: 'OUTBOUND',
          },
          select: {
            id: true,
            timestamp: true,
          },
        },
      },
    });

    // Agrupar por operador
    const operatorsMap = new Map();

    conversations.forEach((conv) => {
      if (!conv.operator) return;

      const opId = conv.operator.id;

      if (!operatorsMap.has(opId)) {
        operatorsMap.set(opId, {
          operatorId: conv.operator.id,
          operatorName: conv.operator.name,
          operatorEmail: conv.operator.email,
          totalConversations: 0,
          openConversations: 0,
          closedConversations: 0,
          totalMessages: 0,
          averageResponseTime: 0,
          conversationsWithCpc: 0,
        });
      }

      const operator = operatorsMap.get(opId);

      operator.totalConversations += 1;

      if (conv.status === 'OPEN') {
        operator.openConversations += 1;
      } else if (conv.status === 'CLOSED') {
        operator.closedConversations += 1;
      }

      operator.totalMessages += conv.messages.length;

      if (conv.cpcMarkedAt) {
        operator.conversationsWithCpc += 1;
      }
    });

    return Array.from(operatorsMap.values());
  }

  async getConversationsReport(params: ConversationsReportParams) {
    const { dateFrom, dateTo, operatorId, status, tabulationId } = params;

    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const where: any = {};

    if (operatorId) {
      where.operatorId = operatorId;
    }

    if (status) {
      where.status = status;
    }

    if (tabulationId) {
      where.tabulationId = tabulationId;
    }

    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        operator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tabulation: {
          select: {
            id: true,
            name: true,
          },
        },
        number: {
          select: {
            phoneNumber: true,
            displayName: true,
          },
        },
        messages: {
          select: {
            id: true,
            direction: true,
            type: true,
            timestamp: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return conversations.map((conv) => {
      const inboundMessages = conv.messages.filter(
        (m) => m.direction === 'INBOUND',
      ).length;
      const outboundMessages = conv.messages.filter(
        (m) => m.direction === 'OUTBOUND',
      ).length;

      return {
        conversationId: conv.id,
        customerPhone: conv.customerPhone,
        customerName: conv.customerName || 'N/A',
        customerContract: conv.customerContract || 'N/A',
        customerCpf: conv.customerCpf || 'N/A',
        operatorName: conv.operator?.name || 'Não atribuído',
        operatorEmail: conv.operator?.email || 'N/A',
        status: conv.status,
        tabulationName: conv.tabulation?.name || 'Não tabulado',
        notes: conv.notes || '',
        totalMessages: conv.messages.length,
        inboundMessages,
        outboundMessages,
        cpcMarked: conv.cpcMarkedAt ? 'Sim' : 'Não',
        cpcMarkedAt: conv.cpcMarkedAt || null,
        phoneNumber: conv.number.phoneNumber,
        phoneDisplayName: conv.number.displayName || 'N/A',
        createdAt: conv.createdAt,
        lastMessageAt: conv.lastMessageAt,
        closedAt: conv.closedAt,
      };
    });
  }

  async getOperatorProductivity(params: DateRangeParams) {
    const { dateFrom, dateTo } = params;

    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const where: any = {};

    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    // Buscar operadores ativos
    const operators = await this.prisma.operator.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const productivity = await Promise.all(
      operators.map(async (operator) => {
        const conversations = await this.prisma.conversation.count({
          where: {
            operatorId: operator.id,
            ...where,
          },
        });

        const closedConversations = await this.prisma.conversation.count({
          where: {
            operatorId: operator.id,
            status: 'CLOSED',
            ...where,
          },
        });

        const messagesCount = await this.prisma.message.count({
          where: {
            direction: 'OUTBOUND',
            conversation: {
              operatorId: operator.id,
            },
            createdAt: dateFilter,
          },
        });

        const cpcCount = await this.prisma.conversation.count({
          where: {
            operatorId: operator.id,
            cpcMarkedAt: {
              not: null,
            },
            ...where,
          },
        });

        const resolutionRate =
          conversations > 0
            ? ((closedConversations / conversations) * 100).toFixed(2)
            : '0.00';

        return {
          operatorId: operator.id,
          operatorName: operator.name,
          operatorEmail: operator.email,
          totalConversations: conversations,
          closedConversations,
          openConversations: conversations - closedConversations,
          totalMessagesSent: messagesCount,
          conversationsWithCpc: cpcCount,
          resolutionRate: `${resolutionRate}%`,
        };
      }),
    );

    return productivity;
  }

  async getConversationsByPeriod(params: ConversationsByPeriodParams) {
    const { dateFrom, dateTo, groupBy } = params;

    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const where: any = {};

    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Agrupar por período
    const grouped = new Map();

    conversations.forEach((conv) => {
      let key: string;

      if (groupBy === 'day') {
        key = conv.createdAt.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const date = new Date(conv.createdAt);
        const week = Math.ceil(date.getDate() / 7);
        key = `${date.getFullYear()}-${date.getMonth() + 1}-W${week}`;
      } else {
        const date = new Date(conv.createdAt);
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          period: key,
          total: 0,
          open: 0,
          closed: 0,
        });
      }

      const group = grouped.get(key);
      group.total += 1;

      if (conv.status === 'OPEN') {
        group.open += 1;
      } else if (conv.status === 'CLOSED') {
        group.closed += 1;
      }
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  }

  async getConversationsByTabulation(params: DateRangeParams) {
    const { dateFrom, dateTo } = params;

    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const where: any = {
      status: 'CLOSED',
      tabulationId: {
        not: null,
      },
    };

    if (dateFilter) {
      where.closedAt = dateFilter;
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        tabulation: true,
      },
    });

    const grouped = new Map();

    conversations.forEach((conv) => {
      if (!conv.tabulation) return;

      const tabId = conv.tabulation.id;

      if (!grouped.has(tabId)) {
        grouped.set(tabId, {
          tabulationId: conv.tabulation.id,
          tabulationName: conv.tabulation.name,
          count: 0,
          withCpc: 0,
          withoutCpc: 0,
        });
      }

      const group = grouped.get(tabId);
      group.count += 1;

      if (conv.cpcMarkedAt) {
        group.withCpc += 1;
      } else {
        group.withoutCpc += 1;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
  }
}

