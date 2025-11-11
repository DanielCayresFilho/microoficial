import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { SetOperatorStatusDto } from './dto/set-operator-status.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OperatorsService {
  private readonly sessionDurationMs: number;
  private readonly heartbeatGraceMs: number;
  private readonly defaultMaxConcurrent: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const sessionHours = this.configService.get<number>(
      'OPERATOR_SESSION_HOURS',
      12,
    );
    const heartbeatGraceMinutes = this.configService.get<number>(
      'OPERATOR_HEARTBEAT_GRACE_MINUTES',
      5,
    );
    this.defaultMaxConcurrent = this.configService.get<number>(
      'OPERATOR_DEFAULT_MAX_CONCURRENT',
      5,
    );

    this.sessionDurationMs = sessionHours * 60 * 60 * 1000;
    this.heartbeatGraceMs = heartbeatGraceMinutes * 60 * 1000;
  }

  async create(dto: CreateOperatorDto) {
    const existing = await this.prisma.operator.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Operator with this email already exists');
    }

    return this.prisma.operator.create({
      data: dto,
    });
  }

  async findAll(activeOnly: boolean = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.operator.findMany({
      where,
      include: {
        _count: {
          select: {
            conversations: {
              where: { status: 'OPEN' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
      include: {
        conversations: {
          where: { status: 'OPEN' },
          include: {
            messages: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
          orderBy: { lastMessageAt: 'desc' },
        },
        _count: {
          select: {
            conversations: {
              where: { status: 'OPEN' },
            },
          },
        },
        presence: true,
      },
    });

    if (!operator) {
      throw new NotFoundException('Operator not found');
    }

    return operator;
  }

  async update(id: string, dto: Partial<CreateOperatorDto>) {
    await this.findOne(id);

    if (dto.email) {
      const existing = await this.prisma.operator.findFirst({
        where: {
          email: dto.email,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Another operator with this email exists');
      }
    }

    return this.prisma.operator.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const operator = await this.findOne(id);

    // Check if operator has open conversations
    if (operator._count.conversations > 0) {
      throw new ConflictException(
        `Cannot delete operator with ${operator._count.conversations} open conversations`,
      );
    }

    return this.prisma.operator.delete({
      where: { id },
    });
  }

  private generateAutoEmail(operatorId: string): string {
    const sanitized = operatorId
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return `operator-${sanitized || 'auto'}@presence.local`;
  }

  async setOnline(operatorId: string, dto: SetOperatorStatusDto) {
    let operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
    });

    if (!operator) {
      const autoEmail = dto.email?.trim() ?? this.generateAutoEmail(operatorId);
      const autoName = dto.name?.trim() || `Operador ${operatorId}`;
      const maxConcurrent =
        dto.maxConcurrent && dto.maxConcurrent > 0
          ? dto.maxConcurrent
          : this.defaultMaxConcurrent;

      operator = await this.prisma.operator.create({
        data: {
          id: operatorId,
          name: autoName,
          email: autoEmail,
          isActive: true,
          maxConcurrent,
        },
      });
    } else {
      const updateOperatorData: Partial<{
        name: string;
        email: string;
        isActive: boolean;
        maxConcurrent: number;
      }> = {};

      if (dto.name && dto.name.trim() && dto.name !== operator.name) {
        updateOperatorData.name = dto.name.trim();
      }

      if (dto.email && dto.email.trim() && dto.email !== operator.email) {
        updateOperatorData.email = dto.email.trim();
      }

      if (
        dto.maxConcurrent &&
        dto.maxConcurrent > 0 &&
        dto.maxConcurrent !== operator.maxConcurrent
      ) {
        updateOperatorData.maxConcurrent = dto.maxConcurrent;
      }

      if (!operator.isActive) {
        updateOperatorData.isActive = true;
      }

      if (Object.keys(updateOperatorData).length > 0) {
        operator = await this.prisma.operator.update({
          where: { id: operatorId },
          data: updateOperatorData,
        });
      }
    }

    let numberId: string | null = null;
    if (dto.numberId) {
      const number = await this.prisma.number.findUnique({
        where: { id: dto.numberId },
      });

      if (!number) {
        throw new NotFoundException('Number not found');
      }

      numberId = number.id;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionDurationMs);

    const presence = await this.prisma.operatorPresence.upsert({
      where: { operatorId },
      create: {
        operatorId,
        numberId,
        queueKey: dto.queueKey ?? null,
        connectedUrl: dto.connectedUrl ?? null,
        segments: dto.segments ?? [],
        isOnline: true,
        startedAt: now,
        lastHeartbeat: now,
        lastAssignedAt: now,
        expiresAt,
      },
      update: {
        numberId,
        queueKey: dto.queueKey ?? null,
        connectedUrl: dto.connectedUrl ?? null,
        segments: dto.segments ?? [],
        isOnline: true,
        startedAt: now,
        lastHeartbeat: now,
        lastAssignedAt: now,
        expiresAt,
      },
      include: {
        operator: true,
        number: true,
      },
    });

    return presence;
  }

  async markOffline(operatorId: string) {
    await this.prisma.operatorPresence.updateMany({
      where: { operatorId },
      data: {
        isOnline: false,
        expiresAt: new Date(),
      },
    });
  }

  async heartbeat(operatorId: string) {
    const presence = await this.prisma.operatorPresence.findUnique({
      where: { operatorId },
    });

    if (!presence) {
      throw new NotFoundException('Operator presence not found');
    }

    if (!presence.isOnline) {
      throw new BadRequestException('Operator is not online');
    }

    await this.prisma.operatorPresence.update({
      where: { operatorId },
      data: {
        lastHeartbeat: new Date(),
      },
    });
  }

  async getOnlineOperators(filters: {
    queueKey?: string;
    segment?: string;
    numberId?: string;
  }) {
    const presences = await this.prisma.operatorPresence.findMany({
      where: { isOnline: true },
      include: {
        operator: true,
        number: true,
      },
      orderBy: [
        { lastAssignedAt: 'asc' },
        { startedAt: 'asc' },
      ],
    });

    const segmentFilter = filters.segment
      ? filters.segment.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    return presences.filter((presence) => {
      if (filters.queueKey) {
        if (
          presence.queueKey &&
          presence.queueKey !== filters.queueKey
        ) {
          return false;
        }
      }

      if (filters.numberId) {
        if (
          presence.numberId &&
          presence.numberId !== filters.numberId
        ) {
          return false;
        }
      }

      if (segmentFilter.length > 0 && presence.segments.length > 0) {
        const match = presence.segments.some((segment) =>
          segmentFilter.includes(segment),
        );
        if (!match) {
          return false;
        }
      }

      return true;
    });
  }

  async expireStalePresences() {
    const now = new Date();
    const heartbeatCutoff = new Date(now.getTime() - this.heartbeatGraceMs);

    const result = await this.prisma.operatorPresence.updateMany({
      where: {
        isOnline: true,
        OR: [
          {
            expiresAt: {
              lt: now,
            },
          },
          {
            lastHeartbeat: {
              lt: heartbeatCutoff,
            },
          },
        ],
      },
      data: {
        isOnline: false,
        expiresAt: now,
      },
    });

    return result.count;
  }
}
