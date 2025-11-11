import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateNumberDto } from './dto/create-number.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  // Account Operations
  async createAccount(dto: CreateAccountDto) {
    const existing = await this.prisma.account.findUnique({
      where: { businessId: dto.businessId },
    });

    if (existing) {
      throw new ConflictException('Account with this Business ID already exists');
    }

    return this.prisma.account.create({
      data: dto,
      include: {
        numbers: true,
      },
    });
  }

  async findAllAccounts() {
    return this.prisma.account.findMany({
      include: {
        numbers: {
          include: {
            _count: {
              select: {
                templates: true,
              },
            },
          },
        },
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAccountById(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        numbers: {
          include: {
            _count: {
              select: {
                templates: true,
              },
            },
          },
        },
        campaigns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async updateAccount(id: string, dto: UpdateAccountDto) {
    await this.findAccountById(id); // Check if exists

    if (dto.businessId) {
      const existing = await this.prisma.account.findFirst({
        where: {
          businessId: dto.businessId,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Another account with this Business ID exists');
      }
    }

    return this.prisma.account.update({
      where: { id },
      data: dto,
      include: {
        numbers: {
          include: {
            _count: {
              select: {
                templates: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteAccount(id: string) {
    await this.findAccountById(id);
    return this.prisma.account.delete({
      where: { id },
    });
  }

  // Number Operations
  async addNumber(accountId: string, dto: CreateNumberDto) {
    await this.findAccountById(accountId);

    const existingPhone = await this.prisma.number.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    const existingPhoneId = await this.prisma.number.findUnique({
      where: { phoneNumberId: dto.phoneNumberId },
    });

    if (existingPhoneId) {
      throw new ConflictException('Phone number ID already registered');
    }

    const segments = dto.segments ?? [];

    return this.prisma.number.create({
      data: {
        phoneNumber: dto.phoneNumber,
        phoneNumberId: dto.phoneNumberId,
        displayName: dto.displayName,
        qualityRating: dto.qualityRating,
        verifiedName: dto.verifiedName,
        isActive: dto.isActive ?? true,
        queueKey: dto.queueKey ?? null,
        segments,
        accountId,
      },
    });
  }

  async findNumbersByAccount(accountId: string) {
    await this.findAccountById(accountId);
    return this.prisma.number.findMany({
      where: { accountId },
      include: {
        _count: {
          select: {
            templates: true,
            conversations: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateNumber(accountId: string, numberId: string, dto: Partial<CreateNumberDto>) {
    const number = await this.prisma.number.findFirst({
      where: { id: numberId, accountId },
    });

    if (!number) {
      throw new NotFoundException('Number not found');
    }

    const updateData: Partial<CreateNumberDto> & {
      segments?: string[];
      queueKey?: string | null;
    } = { ...dto };

    if (dto.queueKey === '') {
      updateData.queueKey = null;
    }

    if (dto.segments) {
      updateData.segments = dto.segments;
    }

    return this.prisma.number.update({
      where: { id: numberId },
      data: updateData,
    });
  }

  async deleteNumber(accountId: string, numberId: string) {
    const number = await this.prisma.number.findFirst({
      where: { id: numberId, accountId },
    });

    if (!number) {
      throw new NotFoundException('Number not found');
    }

    return this.prisma.number.delete({
      where: { id: numberId },
    });
  }
}
