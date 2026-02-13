import { Controller, Delete, Get, Post, Put, Req } from '@nestjs/common';
import { QueryParams } from '@repo/types';
import type { Request } from 'express';
import { SuppliersService } from './suppliers.service.js';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * Get paginated list of suppliers
   */
  @Get('paginated')
  async getSuppliersPaginated(
    @Req() req: Request & { user: { tenantId: string } },
  ) {
    const { tenantId } = req.user;
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    const query = req.query as QueryParams;

    return await this.suppliersService.getSuppliersPaginated(tenantId, query);
  }

  /**
   * Search suppliers by name, company, or phone
   */
  @Get('search')
  async searchSuppliers(@Req() req: Request) {
    const { tenantId } = req.user as { tenantId: string };
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    const { query, limit } = req.query as { query?: string; limit?: string };

    return await this.suppliersService.searchSuppliers(
      tenantId,
      query,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * Get a single supplier with operational stats
   */
  @Get(':id')
  getSupplier(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Supplier ID is required');
    }
    const { tenantId } = req.user as { tenantId: string };
    return this.suppliersService.getSupplier(tenantId, id);
  }

  /**
   * Get purchase orders for a specific supplier
   */
  @Get(':id/purchase-orders')
  getSupplierPurchaseOrders(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Supplier ID is required');
    }
    const { tenantId } = req.user as { tenantId: string };
    const query = req.query as QueryParams;
    return this.suppliersService.getSupplierPurchaseOrders(tenantId, id, query);
  }

  /**
   * Create a new supplier
   */
  @Post()
  createSupplier(@Req() req: Request) {
    const body = req.body as {
      name: string;
      companyName?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      category?: string | null;
      notes?: string | null;
    };
      
    const { tenantId } = req.user as { tenantId: string };
    return this.suppliersService.createSupplier(tenantId, body);
  }

  /**
   * Update an existing supplier
   */
  @Put(':id')
  updateSupplier(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Supplier ID is required');
    }
    const { tenantId } = req.user as { tenantId: string };
    const body = req.body as {
      name?: string;
      companyName?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      category?: string | null;
      notes?: string | null;
      currentBalance?: number;
    };
    return this.suppliersService.updateSupplier(tenantId, id, body);
  }

  /**
   * Delete a supplier (soft delete)
   */
  @Delete(':id')
  deleteSupplier(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Supplier ID is required');
    }
    const { tenantId } = req.user as { tenantId: string };
    return this.suppliersService.deleteSupplier(tenantId, id);
  }
}
