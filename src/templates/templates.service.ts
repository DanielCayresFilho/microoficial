import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTemplateDto) {
    if (dto.numberId) {
      const numberExists = await this.prisma.number.findUnique({
        where: { id: dto.numberId },
      });

      if (!numberExists) {
        throw new NotFoundException('Number not found');
      }
    }

    const payload = {
      name: dto.name,
      language: dto.language,
      category: dto.category ?? 'MARKETING',
      templateId: dto.templateId ?? dto.name,
      status: dto.status ?? 'APPROVED',
      components: dto.components ?? {},
      variables: dto.variables ?? [],
      numberId: dto.numberId ?? null,
    };

    return this.prisma.template.create({
      data: payload,
      include: {
        number: true,
      },
    });
  }

  async findAll(numberId?: string) {
    return this.prisma.template.findMany({
      where: numberId ? { numberId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        number: true,
      },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { number: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async delete(id: string) {
    try {
      await this.prisma.template.delete({ where: { id } });
      return { message: 'Template deleted successfully', id };
    } catch (error) {
      throw new BadRequestException('Failed to delete template');
    }
  }
}

