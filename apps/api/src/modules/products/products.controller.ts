import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { QueryParams, UserRole } from '@repo/types';
import type { Request } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  BulkCreateProductsDto,
  CreateProductDto,
  UpdateProductDto,
} from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('paginated')
  async getProductsPaginated(
    @Req() req: Request & { user: { tenantId: string } },
  ) {
    const { tenantId } = req.user;
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    const query = req.query as QueryParams & { branchId?: string };

    return await this.productsService.getProductsPaginated(tenantId, query);
  }

  @Get('barcode/:barcode')
  async getProductByBarcode(
    @Req() req: Request & { user: { tenantId: string } },
    @Param('barcode') barcode: string,
  ) {
    const { tenantId } = req.user;
    return await this.productsService.getProductByBarcode(barcode, tenantId);
  }

  @Get()
  async getProducts(@Req() req: Request) {
    const { tenantId } = req.user as { tenantId: string };
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    const { branchId } = req.query as { branchId?: string };

    return await this.productsService.getProductsByTenant(tenantId, branchId);
  }

  @Get(':id')
  getProduct(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as { tenantId: string };
    if (!id) {
      throw new Error('Product ID is required');
    }
    return this.productsService.getProductById(id, tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createProduct(@Req() req: Request, @Body() dto: CreateProductDto) {
    const { tenantId } = req.user as { tenantId: string };

    // Extract fields from body - remove branchId/relations (handled as connects)
    const {
      branchId,
      categoryId,
      subcategoryId,
      imageUrl,
      imageKey,
      ...productData
    } = dto;

    const createData: Prisma.ProductCreateInput = {
      ...productData,
      tenant: { connect: { id: tenantId } },
      ...(branchId && { branch: { connect: { id: branchId } } }),
      ...(categoryId && { category: { connect: { id: categoryId } } }),
      ...(subcategoryId && { subcategory: { connect: { id: subcategoryId } } }),
      ...(imageUrl && { imageUrl }),
      ...(imageKey && { imageKey }),
    };
    return this.productsService.createProduct(createData);
  }

  /**
   * Bulk-create products from a parsed CSV. Restricted to ADMIN/MANAGER to
   * match the stock-adjustment precedent — a row may set initial inventory.
   */
  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  bulkCreate(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: BulkCreateProductsDto,
  ) {
    return this.productsService.bulkCreateProducts({
      tenantId,
      userId,
      branchId: dto.branchId,
      rows: dto.rows,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateProduct(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    if (!id) {
      throw new Error('Product ID is required');
    }
    const { tenantId } = req.user as { tenantId: string };

    // Handle relations and image fields update explicitly
    const {
      imageUrl,
      imageKey,
      categoryId,
      subcategoryId,
      branchId,
      ...productData
    } = dto;

    const updateData: Prisma.ProductUpdateInput = {
      ...productData,
      ...(imageUrl !== undefined && { imageUrl }),
      ...(imageKey !== undefined && { imageKey }),
      ...(categoryId && { category: { connect: { id: categoryId } } }),
      ...(subcategoryId && { subcategory: { connect: { id: subcategoryId } } }),
    };

    if (branchId !== undefined) {
      if (branchId) {
        updateData.branch = { connect: { id: branchId } };
      } else {
        updateData.branch = { disconnect: true };
      }
    }
    const params = { id, tenantId };
    return this.productsService.updateProduct(params, updateData);
  }

  @Put('/delete/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteProduct(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as { tenantId: string };
    if (!id) {
      throw new Error('Product ID is required');
    }
    return this.productsService.deleteProduct(id, tenantId);
  }

  @Get(':id/modifiers')
  getModifiersByProduct(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as { tenantId: string };

    if (!id) {
      throw new Error('Product ID is required');
    }

    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    return this.productsService.getModifiersByProduct(id, tenantId);
  }
}
