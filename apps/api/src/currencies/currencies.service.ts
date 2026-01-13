import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // TENANT CURRENCY OPERATIONS
  // ==========================================

  /**
   * Get all currencies configured for a tenant
   * Includes the base currency info from the tenant
   */
  async getTenantCurrencies(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { baseCurrencyCode: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const currencies = await this.prisma.tenantCurrency.findMany({
      where: { tenantId },
      include: {
        currency: true, // Include currency reference data
      },
      orderBy: [{ isDefault: 'desc' }, { currencyCode: 'asc' }],
    });

    return {
      baseCurrencyCode: tenant.baseCurrencyCode,
      currencies,
    };
  }

  /**
   * Get active currencies only (for POS usage)
   */
  async getActiveTenantCurrencies(tenantId: string) {
    return this.prisma.tenantCurrency.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        currency: true,
      },
      orderBy: [{ isDefault: 'desc' }, { currencyCode: 'asc' }],
    });
  }

  /**
   * Get a single tenant currency by ID
   */
  async getTenantCurrency(tenantId: string, id: string) {
    const tenantCurrency = await this.prisma.tenantCurrency.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        currency: true,
      },
    });

    if (!tenantCurrency) {
      throw new NotFoundException('Currency configuration not found');
    }

    return tenantCurrency;
  }

  /**
   * Get tenant currency by currency code
   */
  async getTenantCurrencyByCode(tenantId: string, currencyCode: string) {
    const tenantCurrency = await this.prisma.tenantCurrency.findUnique({
      where: {
        tenantId_currencyCode: {
          tenantId,
          currencyCode,
        },
      },
      include: {
        currency: true,
      },
    });

    if (!tenantCurrency) {
      throw new NotFoundException(
        `Currency ${currencyCode} not configured for this tenant`,
      );
    }

    return tenantCurrency;
  }

  /**
   * Add a new currency to a tenant's configuration
   */
  async createTenantCurrency(
    tenantId: string,
    data: {
      currencyCode: string;
      exchangeRate: number | string;
      isActive?: boolean;
    },
  ) {
    const { currencyCode, exchangeRate, isActive = true } = data;

    // Validate currency code format (ISO 4217 - uppercase 3 letters)
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      throw new BadRequestException(
        'Currency code must be a valid ISO 4217 code (3 uppercase letters)',
      );
    }

    // Validate exchange rate
    const rate = Number(exchangeRate);
    if (isNaN(rate) || rate <= 0) {
      throw new BadRequestException('Exchange rate must be a positive number');
    }

    // Check if currency exists in the reference table
    const currency = await this.prisma.currency.findUnique({
      where: { code: currencyCode },
    });

    // If currency doesn't exist in reference table, require it to be added first
    if (!currency) {
      throw new BadRequestException(
        `Currency ${currencyCode} is not available. Please contact support to add new currencies.`,
      );
    }

    // Check if tenant already has this currency configured
    const existing = await this.prisma.tenantCurrency.findUnique({
      where: {
        tenantId_currencyCode: {
          tenantId,
          currencyCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Currency ${currencyCode} is already configured for this tenant`,
      );
    }

    // Get tenant's base currency to determine if this is the default
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { baseCurrencyCode: true },
    });

    const isDefault = tenant?.baseCurrencyCode === currencyCode;

    return this.prisma.tenantCurrency.create({
      data: {
        tenantId,
        currencyCode,
        exchangeRate: rate,
        isActive,
        isDefault,
      },
      include: {
        currency: true,
      },
    });
  }

  /**
   * Update a tenant's currency configuration (exchange rate, active status)
   * Note: Exchange rate changes only affect FUTURE orders
   */
  async updateTenantCurrency(
    tenantId: string,
    id: string,
    data: {
      exchangeRate?: number | string;
      isActive?: boolean;
    },
  ) {
    const tenantCurrency = await this.getTenantCurrency(tenantId, id);

    // Validate exchange rate if provided
    if (data.exchangeRate !== undefined) {
      const rate = Number(data.exchangeRate);
      if (isNaN(rate) || rate <= 0) {
        throw new BadRequestException(
          'Exchange rate must be a positive number',
        );
      }
      data.exchangeRate = rate;
    }

    // Prevent deactivating the base/default currency
    if (data.isActive === false && tenantCurrency.isDefault) {
      throw new BadRequestException(
        'Cannot deactivate the base currency. Change the base currency first.',
      );
    }

    return this.prisma.tenantCurrency.update({
      where: { id },
      data: {
        exchangeRate: data.exchangeRate,
        isActive: data.isActive,
      },
      include: {
        currency: true,
      },
    });
  }

  /**
   * Remove a currency from tenant configuration
   * Soft-disable is preferred, but this allows hard delete if no payments exist
   */
  async deleteTenantCurrency(tenantId: string, id: string) {
    const tenantCurrency = await this.getTenantCurrency(tenantId, id);

    // Prevent deleting the base/default currency
    if (tenantCurrency.isDefault) {
      throw new BadRequestException(
        'Cannot delete the base currency. Change the base currency first.',
      );
    }

    // Check if currency is used in any payments
    const paymentsCount = await this.prisma.payment.count({
      where: {
        currencyCode: tenantCurrency.currencyCode,
        order: {
          tenantId,
        },
      },
    });

    if (paymentsCount > 0) {
      throw new BadRequestException(
        `Cannot delete currency ${tenantCurrency.currencyCode} as it is used in ${paymentsCount} payment(s). Consider deactivating it instead.`,
      );
    }

    return this.prisma.tenantCurrency.delete({
      where: { id },
    });
  }

  /**
   * Set a new base currency for the tenant
   * This is a significant operation that affects reporting
   */
  async setBaseCurrency(tenantId: string, currencyCode: string) {
    // Validate currency code format
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      throw new BadRequestException(
        'Currency code must be a valid ISO 4217 code (3 uppercase letters)',
      );
    }

    // Ensure the currency is configured for this tenant
    const tenantCurrency = await this.prisma.tenantCurrency.findUnique({
      where: {
        tenantId_currencyCode: {
          tenantId,
          currencyCode,
        },
      },
    });

    if (!tenantCurrency) {
      throw new BadRequestException(
        `Currency ${currencyCode} must be added to tenant currencies before setting as base`,
      );
    }

    // Transaction: update tenant base currency and toggle isDefault flags
    return this.prisma.$transaction(async (tx) => {
      // Reset all isDefault flags for this tenant
      await tx.tenantCurrency.updateMany({
        where: { tenantId },
        data: { isDefault: false },
      });

      // Set new default
      await tx.tenantCurrency.update({
        where: { id: tenantCurrency.id },
        data: {
          isDefault: true,
          isActive: true, // Ensure base currency is always active
          exchangeRate: 1, // Base currency always has rate of 1
        },
      });

      // Update tenant's base currency
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { baseCurrencyCode: currencyCode },
        select: {
          id: true,
          baseCurrencyCode: true,
        },
      });

      return updatedTenant;
    });
  }

  // ==========================================
  // GLOBAL CURRENCY REFERENCE OPERATIONS
  // (Typically admin-only)
  // ==========================================

  /**
   * Get all available currencies from the reference table
   */
  async getAllCurrencies() {
    return this.prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Get a single currency by code
   */
  async getCurrency(code: string) {
    const currency = await this.prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!currency) {
      throw new NotFoundException(`Currency ${code} not found`);
    }

    return currency;
  }

  /**
   * Create a new currency in the reference table (system admin only)
   */
  async createCurrency(data: Prisma.CurrencyCreateInput) {
    const code = data.code.toUpperCase();

    // Validate currency code format
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new BadRequestException(
        'Currency code must be a valid ISO 4217 code (3 uppercase letters)',
      );
    }

    // Check for existing currency
    const existing = await this.prisma.currency.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(`Currency ${code} already exists`);
    }

    return this.prisma.currency.create({
      data: {
        ...data,
        code,
      },
    });
  }

  /**
   * Update a currency in the reference table (system admin only)
   */
  async updateCurrency(code: string, data: Prisma.CurrencyUpdateInput) {
    await this.getCurrency(code); // Throws if not found

    return this.prisma.currency.update({
      where: { code: code.toUpperCase() },
      data,
    });
  }

  // ==========================================
  // PAGINATION (following Tax pattern)
  // ==========================================

  async getTenantCurrenciesPaginated(tenantId: string, params: QueryParams) {
    const { search, sort, order } = params;
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantCurrencyWhereInput = { tenantId };

    if (search) {
      where.OR = [
        {
          currencyCode: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          currency: {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      ];
    }

    const orderBy: Prisma.TenantCurrencyOrderByWithRelationInput = {};
    if (sort) {
      (orderBy as Record<string, string>)[sort] = order || 'asc';
    } else {
      orderBy.currencyCode = 'asc';
    }

    const [totalCount, data] = await Promise.all([
      this.prisma.tenantCurrency.count({ where }),
      this.prisma.tenantCurrency.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          currency: true,
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }
}
