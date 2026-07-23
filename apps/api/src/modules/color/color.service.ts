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

  async seedColors(tenantId: string) {
    const defaultColors = [
      { name: 'Red', hex: '#EF4444', tenantId },
      { name: 'Orange', hex: '#F97316', tenantId },
      { name: 'Amber', hex: '#F59E0B', tenantId },
      { name: 'Yellow', hex: '#EAB308', tenantId },
      { name: 'Lime', hex: '#84CC16', tenantId },
      { name: 'Green', hex: '#22C55E', tenantId },
      { name: 'Emerald', hex: '#10B981', tenantId },
      { name: 'Teal', hex: '#14B8A6', tenantId },
      { name: 'Cyan', hex: '#06B6D4', tenantId },
      { name: 'Sky', hex: '#0EA5E9', tenantId },
      { name: 'Blue', hex: '#3B82F6', tenantId },
      { name: 'Indigo', hex: '#6366F1', tenantId },
      { name: 'Violet', hex: '#8B5CF6', tenantId },
      { name: 'Purple', hex: '#A855F7', tenantId },
      { name: 'Fuchsia', hex: '#D946EF', tenantId },
      { name: 'Pink', hex: '#EC4899', tenantId },
      { name: 'Rose', hex: '#F43F5E', tenantId },
      { name: 'Slate', hex: '#64748B', tenantId },
      { name: 'Gray', hex: '#6B7280', tenantId },
      { name: 'Zinc', hex: '#71717A', tenantId },
      { name: 'Neutral', hex: '#737373', tenantId },
      { name: 'Stone', hex: '#78716C', tenantId },
    ];

    // Idempotent: adds any missing default colors and skips ones already
    // present (guarded by the @@unique([tenantId, name]) / ([tenantId, hex])
    // constraints), so re-running "Seed Colors" never errors.
    return await this.prisma.color.createMany({
      data: defaultColors,
      skipDuplicates: true,
    });
  }
}
