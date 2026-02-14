import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateColorDto, UpdateColorDto } from './dto/color.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Color } from '../../generated/prisma/browser.js';

@Injectable()
export class ColorService {
  constructor(private readonly prisma: PrismaService) {}

  async createColor(data: CreateColorDto) {
    return await this.prisma.color.create({
      data,
    });
  }

  async getColors(tenantId: string): Promise<Color[]> {
    try {
      const colors = await this.prisma.color.findMany({
        where: { tenantId },
        orderBy: {
          name: 'asc',
        },
      });
      return colors;
    } catch (error) {
      console.error('Error fetching colors:', error);
      throw new Error('Failed to fetch colors');
    }
  }

  async getColor(tenantId: string, id: string): Promise<any> {
    const color = await this.prisma.color.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!color) {
      throw new NotFoundException('Color not found');
    }

    return color;
  }

  async updateColor(data: UpdateColorDto) {
    const { id, ...updateData } = data;
    await this.getColor(updateData.tenantId!, id);

    return this.prisma.color.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteColor(tenantId: string, id: string) {
    await this.getColor(tenantId, id);

    return this.prisma.color.delete({
      where: { id },
    });
  }
}
