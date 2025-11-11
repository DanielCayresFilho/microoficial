import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';

@Injectable()
export class OperatorsService {
  constructor(private prisma: PrismaService) {}

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
}
