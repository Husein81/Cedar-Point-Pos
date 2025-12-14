import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';
import { CreateModifierDto, UpdateModifierDto } from './dto/modifier.dto';

@Injectable()
export class ModifiersService {
  /**
   * Create a new modifier in a group
   */
  async create(
    tenantId: string,
    groupId: string,
    createDto: CreateModifierDto,
  ) {
    const { name, price, productId } = createDto;

    // Verify the modifier group exists and belongs to this tenant
    const group = await prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!group) {
      throw new NotFoundException('Modifier group not found');
    }

    // If productId is provided, verify the product exists and belongs to this tenant
    if (productId) {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          tenantId,
          isDeleted: false,
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }
    }

    // Check if modifier with same name already exists in this group
    const existing = await prisma.modifier.findFirst({
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

    const modifier = await prisma.modifier.create({
      data: {
        tenantId,
        groupId,
        name,
        price,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
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
    const group = await prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!group) {
      throw new NotFoundException('Modifier group not found');
    }

    const modifiers = await prisma.modifier.findMany({
      where: {
        groupId,
        tenantId,
        ...(!includeDeleted && { isDeleted: false }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
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
    const modifier = await prisma.modifier.findFirst({
      where: {
        id,
        groupId,
        tenantId,
        isDeleted: false,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
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
    const modifier = await prisma.modifier.findFirst({
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

    // If updating productId, verify the product exists and belongs to this tenant
    if (updateDto.productId !== undefined) {
      if (updateDto.productId) {
        const product = await prisma.product.findFirst({
          where: {
            id: updateDto.productId,
            tenantId,
            isDeleted: false,
          },
        });

        if (!product) {
          throw new NotFoundException('Product not found');
        }
      }
    }

    // If updating name, check for duplicates in the same group
    if (updateDto.name && updateDto.name !== modifier.name) {
      const duplicate = await prisma.modifier.findFirst({
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

    const updated = await prisma.modifier.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.price !== undefined && { price: updateDto.price }),
        ...(updateDto.productId !== undefined && {
          productId: updateDto.productId,
        }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Soft delete a modifier
   */
  async remove(tenantId: string, groupId: string, id: string) {
    const modifier = await prisma.modifier.findFirst({
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

    await prisma.modifier.update({
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
    const group = await prisma.modifierGroup.findFirst({
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
      .map((m) => m.productId)
      .filter((id): id is string => !!id);

    if (productIds.length > 0) {
      const products = await prisma.product.findMany({
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
    const existingModifiers = await prisma.modifier.findMany({
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

    // Create all modifiers
    const created = await prisma.$transaction(
      modifiers.map((modifier) =>
        prisma.modifier.create({
          data: {
            tenantId,
            groupId,
            name: modifier.name,
            price: modifier.price,
            productId: modifier.productId,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ),
    );

    return created;
  }
}
