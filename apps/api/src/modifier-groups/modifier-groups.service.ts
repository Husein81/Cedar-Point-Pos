import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma, ModifierType, Prisma } from '@repo/db';
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
} from './dto/modifier-group.dto';

@Injectable()
export class ModifierGroupsService {
  /**
   * Create a new modifier group
   */
  async create(tenantId: string, createDto: CreateModifierGroupDto) {
    const { name, type } = createDto;

    // Check if modifier group with same name already exists for this tenant
    const existing = await prisma.modifierGroup.findFirst({
      where: {
        tenantId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
        isDeleted: false,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Modifier group with name "${name}" already exists`,
      );
    }

    const modifierGroup = await prisma.modifierGroup.create({
      data: {
        tenantId,
        name,
        type,
      },
      include: {
        modifiers: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            price: true,
            productId: true,
          },
        },
      },
    });

    return modifierGroup;
  }

  /**
   * Get all modifier groups for a tenant
   */
  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      type?: ModifierType;
      includeDeleted?: boolean;
    },
  ) {
    try {
      const { page = 1, limit = 10, type, includeDeleted = false } = params;
      const skip = (page - 1) * limit;

      const where: Prisma.ModifierGroupWhereInput = {
        tenantId,
        ...(type && { type }),
        ...(!includeDeleted && { isDeleted: false }),
      };

      const [totalCount, modifierGroups] = await Promise.all([
        prisma.modifierGroup.count({ where }),
        prisma.modifierGroup.findMany({
          where,
          include: {
            modifiers: {
              where: { isDeleted: false },
              select: {
                id: true,
                name: true,
                price: true,
                productId: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: {
            name: 'asc',
          },
        }),
      ]);

      return {
        data: modifierGroups,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching modifier groups:', error);
      throw error;
    }
  }

  /**
   * Get a specific modifier group by ID
   */
  async findOne(tenantId: string, id: string) {
    const modifierGroup = await prisma.modifierGroup.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
      include: {
        modifiers: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            price: true,
            productId: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!modifierGroup) {
      throw new NotFoundException('Modifier group not found');
    }

    return modifierGroup;
  }

  /**
   * Update a modifier group
   */
  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateModifierGroupDto,
  ) {
    const modifierGroup = await prisma.modifierGroup.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
    });

    if (!modifierGroup) {
      throw new NotFoundException('Modifier group not found');
    }

    // If updating name, check for duplicates
    if (updateDto.name && updateDto.name !== modifierGroup.name) {
      const duplicate = await prisma.modifierGroup.findFirst({
        where: {
          tenantId,
          name: {
            equals: updateDto.name,
            mode: 'insensitive',
          },
          isDeleted: false,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          `Modifier group with name "${updateDto.name}" already exists`,
        );
      }
    }

    const updated = await prisma.modifierGroup.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.type && { type: updateDto.type }),
      },
      include: {
        modifiers: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            price: true,
            productId: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Soft delete a modifier group
   */
  async remove(tenantId: string, id: string) {
    const modifierGroup = await prisma.modifierGroup.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
    });

    if (!modifierGroup) {
      throw new NotFoundException('Modifier group not found');
    }

    // Soft delete the group and all its modifiers
    await prisma.$transaction([
      prisma.modifierGroup.update({
        where: { id },
        data: { isDeleted: true },
      }),
      prisma.modifier.updateMany({
        where: { groupId: id },
        data: { isDeleted: true },
      }),
    ]);

    return { message: 'Modifier group deleted successfully' };
  }

  /**
   * Get modifier groups by type
   */
  async findByType(tenantId: string, type: ModifierType) {
    const modifierGroups = await prisma.modifierGroup.findMany({
      where: {
        tenantId,
        type,
        isDeleted: false,
      },
      include: {
        modifiers: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            price: true,
            productId: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return modifierGroups;
  }
}
