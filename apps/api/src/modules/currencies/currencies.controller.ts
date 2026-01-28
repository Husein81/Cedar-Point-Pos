import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Query,
} from '@nestjs/common';
import { User, UserRole } from '@repo/types';
import type { QueryParams } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrenciesService } from './currencies.service.js';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Currency Controller
 *
 * Handles currency management for multi-currency POS operations.
 * Follows the Lebanon market requirements:
 * - Each tenant has a base currency (typically USD)
 * - Multiple currencies can be active (USD, LBP, EUR)
 * - Exchange rates are tenant-controlled and manual
 * - Exchange rates at payment time are locked forever
 */
@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  // ==========================================
  // TENANT CURRENCY ENDPOINTS
  // ==========================================

  /**
   * Get all currencies configured for the current tenant
   * Includes base currency information
   */
  @Get()
  getTenantCurrencies(@Req() req: Request) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.currenciesService.getTenantCurrencies(user.tenantId);
  }

  /**
   * Get paginated currencies for the current tenant
   */
  @Get('paginated')
  getTenantCurrenciesPaginated(
    @Req() req: Request,
    @Query() query: QueryParams,
  ) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.currenciesService.getTenantCurrenciesPaginated(
      user.tenantId,
      query,
    );
  }

  /**
   * Get only active currencies (for POS dropdown)
   */
  @Get('active')
  getActiveTenantCurrencies(@Req() req: Request) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.currenciesService.getActiveTenantCurrencies(user.tenantId);
  }

  /**
   * Get a specific tenant currency configuration by ID
   */
  @Get(':id')
  getTenantCurrency(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.currenciesService.getTenantCurrency(user.tenantId, id);
  }

  /**
   * Get a tenant currency by its code
   */
  @Get('code/:code')
  getTenantCurrencyByCode(@Req() req: Request, @Param('code') code: string) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.currenciesService.getTenantCurrencyByCode(
      user.tenantId,
      code.toUpperCase(),
    );
  }

  /**
   * Add a new currency to the tenant's configuration
   * Only ADMIN and MANAGER can manage currencies
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createTenantCurrency(
    @Req() req: Request,
    @Body()
    body: {
      currencyCode: string;
      exchangeRate: number | string;
      isActive?: boolean;
    },
  ) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.currenciesService.createTenantCurrency(user.tenantId, body);
  }

  /**
   * Update a tenant currency (exchange rate, active status)
   * Note: Changes only affect future orders, never retroactive
   */
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateTenantCurrency(
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    body: {
      exchangeRate?: number | string;
      isActive?: boolean;
    },
  ) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.currenciesService.updateTenantCurrency(user.tenantId, id, body);
  }

  /**
   * Delete a tenant currency configuration
   * Cannot delete if used in payments - use deactivation instead
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteTenantCurrency(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.currenciesService.deleteTenantCurrency(user.tenantId, id);
  }

  /**
   * Set the base currency for the tenant
   * This is a significant operation affecting reporting
   */
  @Put('base/:currencyCode')
  @Roles(UserRole.ADMIN)
  setBaseCurrency(
    @Req() req: Request,
    @Param('currencyCode') currencyCode: string,
  ) {
    const user = req.user as User;
    if (!user.tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.currenciesService.setBaseCurrency(
      user.tenantId,
      currencyCode.toUpperCase(),
    );
  }

  // ==========================================
  // GLOBAL CURRENCY REFERENCE ENDPOINTS
  // (Available to all authenticated users for lookup)
  // ==========================================

  /**
   * Get all available currencies from the global reference table
   */
  @Get('reference/all')
  getAllCurrencies() {
    return this.currenciesService.getAllCurrencies();
  }

  /**
   * Get a specific currency from the reference table
   */
  @Get('reference/:code')
  getCurrency(@Param('code') code: string) {
    return this.currenciesService.getCurrency(code);
  }

  /**
   * Create a new currency in the reference table (System Admin only)
   */
  @Post('reference')
  @Roles(UserRole.SYSTEM_ADMIN)
  createCurrency(@Body() body: Prisma.CurrencyCreateInput) {
    return this.currenciesService.createCurrency(body);
  }

  /**
   * Update a currency in the reference table (System Admin only)
   */
  @Put('reference/:code')
  @Roles(UserRole.SYSTEM_ADMIN)
  updateCurrency(
    @Param('code') code: string,
    @Body() body: Prisma.CurrencyUpdateInput,
  ) {
    return this.currenciesService.updateCurrency(code, body);
  }
}
