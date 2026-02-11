import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateModifierDto, UpdateModifierDto } from './dto/modifier.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class ModifiersService {
  constructor(private readonly prisma: PrismaService) {}
  /**
   * Create a new modifier in a group
   */
  async create(
    tenantId: string,
    groupId: string,
    createDto: CreateModifierDto,
  ) {
    const { name, price, productIds } = createDto;

    // Verify the modifier group exists and belongs to this tenant
    const group = await this.prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!group) {
      throw new NotFoundException('Modifier group not found');
    }

    // Validate all product IDs if provided
    if (productIds && productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          isDeleted: false,
          isModifiable: true, // ✅ Only allow modifiable products
        },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException(
          'One or more products not found or not modifiable',
        );
      }
    }

    // Check if modifier with same name already exists in this group
    const existing = await this.prisma.modifier.findFirst({
      where: {
        groupId,
        name: {
          equals: name,
          mode: Prisma.QueryMode.insensitive,
        },
        isDeleted: false,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Modifier with name "${name}" already exists in this group`,
      );
    }

    // Create modifier with product assignments in a transaction
    const modifier = await this.prisma.$transaction(async (tx) => {
      const newMod = await tx.modifier.create({
        data: {
          tenantId,
          groupId,
          name,
          price,
        },
      });

      // Create product assignments if provided
      if (productIds && productIds.length > 0) {
        await tx.modifierProductAssignment.createMany({
          data: productIds.map((productId) => ({
            modifierId: newMod.id,
            productId,
          })),
        });
      }

      // Return modifier with assignments
      return tx.modifier.findUnique({
        where: { id: newMod.id },
        include: {
          productAssignments: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    return modifier;
  }

  /**
   * Get all modifiers in a group
   */
  async findAllInGroup(
    tenantId: string,
    groupId: string,
    params: {
      includeDeleted?: boolean;
    },
  ) {
    const { includeDeleted = false } = params;

    // Verify the modifier group exists and belongs to this tenant
    const group = await this.prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!group) {
      throw new NotFoundException('Modifier group not found');
    }

    const modifiers = await this.prisma.modifier.findMany({
      where: {
        groupId,
        tenantId,
        ...(!includeDeleted && { isDeleted: false }),
      },
      include: {
        productAssignments: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return modifiers;
  }

  /**
   * Get a specific modifier by ID
   */
  async findOne(tenantId: string, groupId: string, id: string) {
    const modifier = await this.prisma.modifier.findFirst({
      where: {
        id,
        groupId,
        tenantId,
        isDeleted: false,
      },
      include: {
        productAssignments: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!modifier) {
      throw new NotFoundException('Modifier not found');
    }

    return modifier;
  }

  /**
   * Update a modifier
   */
  async update(
    tenantId: string,
    groupId: string,
    id: string,
    updateDto: UpdateModifierDto,
  ) {
    const modifier = await this.prisma.modifier.findFirst({
      where: {
        id,
        groupId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!modifier) {
      throw new NotFoundException('Modifier not found');
    }

    // Validate product IDs if being updated
    if (updateDto.productIds !== undefined) {
      if (updateDto.productIds.length > 0) {
        const products = await this.prisma.product.findMany({
          where: {
            id: { in: updateDto.productIds },
            tenantId,
            isDeleted: false,
            isModifiable: true,
          },
        });

        if (products.length !== updateDto.productIds.length) {
          throw new BadRequestException(
            'One or more products not found or not modifiable',
          );
        }
      }
    }

    // If updating name, check for duplicates in the same group
    if (updateDto.name && updateDto.name !== modifier.name) {
      const duplicate = await this.prisma.modifier.findFirst({
        where: {
          groupId,
          name: {
            equals: updateDto.name,
            mode: Prisma.QueryMode.insensitive,
          },
          isDeleted: false,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          `Modifier with name "${updateDto.name}" already exists in this group`,
        );
      }
    }

    // Update modifier and product assignments in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      // Update modifier basic fields
      const updatedMod = await tx.modifier.update({
        where: { id },
        data: {
          ...(updateDto.name && { name: updateDto.name }),
          ...(updateDto.price !== undefined && { price: updateDto.price }),
        },
      });

      // Update product assignments if provided
      if (updateDto.productIds !== undefined) {
        // Delete existing assignments
        await tx.modifierProductAssignment.deleteMany({
          where: { modifierId: id },
        });

        // Create new assignments
        if (updateDto.productIds.length > 0) {
          await tx.modifierProductAssignment.createMany({
            data: updateDto.productIds.map((productId) => ({
              modifierId: id,
              productId,
            })),
          });
        }
      }

      // Return updated modifier with assignments
      return tx.modifier.findUnique({
        where: { id },
        include: {
          productAssignments: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    return updated;
  }

  /**
   * Soft delete a modifier
   */
  async remove(tenantId: string, groupId: string, id: string) {
    const modifier = await this.prisma.modifier.findFirst({
      where: {
        id,
        groupId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!modifier) {
      throw new NotFoundException('Modifier not found');
    }

    await this.prisma.modifier.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { message: 'Modifier deleted successfully' };
  }

  /**
   * Bulk create modifiers for a group
   */
  async bulkCreate(
    tenantId: string,
    groupId: string,
    modifiers: CreateModifierDto[],
  ) {
    // Verify the modifier group exists and belongs to this tenant
    const group = await this.prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!group) {
      throw new NotFoundException('Modifier group not found');
    }

    // Validate all productIds if provided
    const productIds = modifiers
      .map((m) => m.productIds || [])
      .flat()
      .filter((id): id is string => !!id);

    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          isDeleted: false,
        },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('One or more products not found');
      }
    }

    // Check for duplicate names within the group
    const existingModifiers = await this.prisma.modifier.findMany({
      where: {
        groupId,
        isDeleted: false,
      },
      select: { name: true },
    });

    const existingNames = new Set(
      existingModifiers.map((m) => m.name.toLowerCase()),
    );
    const newNames = modifiers.map((m) => m.name.toLowerCase());
    const duplicates = newNames.filter((name) => existingNames.has(name));

    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Modifiers with names already exist: ${duplicates.join(', ')}`,
      );
    }

    // Create all modifiers with product assignments
    const created = await this.prisma.$transaction(
      modifiers.map((modifier) =>
        this.prisma.modifier.create({
          data: {
            tenantId,
            groupId,
            name: modifier.name,
            price: modifier.price,
          },
          include: {
            productAssignments: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
      ),
    );

    // Create product assignments for modifiers that have productIds
    for (let i = 0; i < created.length; i++) {
      const modifier = created[i];
      const productIds = modifiers[i].productIds;
      
      if (productIds && productIds.length > 0) {
        await this.prisma.modifierProductAssignment.createMany({
          data: productIds.map((productId) => ({
            modifierId: modifier.id,
            productId,
          })),
        });
      }
    }

    return created;
  }
}
