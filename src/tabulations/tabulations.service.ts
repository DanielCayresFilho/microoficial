import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTabulationDto } from './dto/create-tabulation.dto';

@Injectable()
export class TabulationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTabulationDto) {
    const existing = await this.prisma.tabulation.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Tabulation with this name already exists');
    }

    return this.prisma.tabulation.create({
      data: dto,
    });
  }

  async findAll(activeOnly: boolean = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.tabulation.findMany({
      where,
      include: {
        _count: {
          select: { conversations: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const tabulation = await this.prisma.tabulation.findUnique({
      where: { id },
      include: {
        _count: {
          select: { conversations: true },
        },
      },
    });

    if (!tabulation) {
      throw new NotFoundException('Tabulation not found');
    }

    return tabulation;
  }

  async update(id: string, dto: Partial<CreateTabulationDto>) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.tabulation.findFirst({
        where: {
          name: dto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Another tabulation with this name exists');
      }
    }

    return this.prisma.tabulation.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tabulation.delete({
      where: { id },
    });
  }
}
