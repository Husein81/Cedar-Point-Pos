import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Default currency codes to initialize for new tenants
 * USD is the base currency by default
 */
const DEFAULT_TENANT_CURRENCIES = [
  { code: 'USD', exchangeRate: 1, isDefault: true },
  { code: 'LBP', exchangeRate: 89500, isDefault: false }, // Example rate, tenant will update
];

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
        // Create tenant with default base currency
        const newTenant = await tx.tenant.create({
          data: {
            ...data,
            baseCurrencyCode: data.baseCurrencyCode || 'USD',
          },
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

        // Initialize default currencies for the tenant
        // Ensure they exist in the global reference table first
        for (const curr of DEFAULT_TENANT_CURRENCIES) {
          // Upsert into global Currency table to satisfy Foreign Key constraints
          await tx.currency.upsert({
            where: { code: curr.code },
            update: {},
            create: {
              code: curr.code,
              name:
                curr.code === 'USD'
                  ? 'United States Dollar'
                  : curr.code === 'LBP'
                    ? 'Lebanese Pound'
                    : curr.code,
              symbol:
                curr.code === 'USD' ? '$' : curr.code === 'LBP' ? 'ل.ل' : '',
              decimalPlaces: curr.code === 'LBP' ? 0 : 2,
            },
          });

          // Create tenant-specific configuration
          await tx.tenantCurrency.create({
            data: {
              tenantId: newTenant.id,
              currencyCode: curr.code,
              exchangeRate: curr.exchangeRate,
              isDefault: curr.isDefault,
              isActive: true,
            },
          });
        }

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
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Delete tenant and cascade delete all associated data
    await this.prisma.tenant.delete({
      where: { id },
    });

    return { message: 'Tenant deleted successfully' };
  }

  async updateTenant(id: string, data: Prisma.TenantUpdateInput) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return await this.prisma.tenant.update({
      where: { id },
      data,
    });
  }
}
