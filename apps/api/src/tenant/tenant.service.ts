import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenants() {
    return await this.prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true, branches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, branches: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async getTenantUsers(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  async createTenant(data: Prisma.TenantCreateInput) {
    try {
      const tenant = await this.prisma.$transaction(async (tx) => {
        // Create tenant
        const newTenant = await tx.tenant.create({
          data,
          include: {
            _count: {
              select: { users: true, branches: true },
            },
          },
        });

        // Create default "Main" branch
        await tx.branch.create({
          data: {
            tenantId: newTenant.id,
            name: 'Main',
          },
        });

        return newTenant;
      });

      return tenant;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw new InternalServerErrorException(
        `Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            branches: true,
            orders: true,
            products: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check for dependent data
    const hasData =
      tenant._count.users > 0 ||
      tenant._count.branches > 0 ||
      tenant._count.orders > 0 ||
      tenant._count.products > 0;

    if (hasData) {
      throw new BadRequestException(
        `Cannot delete tenant. It has ${tenant._count.users} users, ${tenant._count.branches} branches, ${tenant._count.products} products, and ${tenant._count.orders} orders. Please remove all associated data first.`,
      );
    }

    await this.prisma.tenant.delete({
      where: { id },
    });

    return { message: 'Tenant deleted successfully' };
  }
}
