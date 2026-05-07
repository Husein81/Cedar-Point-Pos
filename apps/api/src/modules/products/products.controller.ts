import { Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { QueryParams } from '@repo/types';
import type { Request } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
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
  getProduct(@Param('id') id: string) {
    if (!id) {
      throw new Error('Product ID is required');
    }
    return this.productsService.getProductById(id);
  }

  @Post()
  createProduct(@Req() req: Request) {
    const body = req.body as Prisma.ProductCreateInput & {
      branchId?: string;
      imageUrl?: string;
      categoryId?: string;
      subcategoryId?: string;
    };
    const { tenantId } = req.user as { tenantId: string };

    // Extract fields from body - remove tenantId and branchId (they'll be handled as relations)
    const { branchId, categoryId, subcategoryId, imageUrl, ...productData } =
      body;

    const createData: Prisma.ProductCreateInput = {
      ...productData,
      tenant: { connect: { id: tenantId } },
      ...(branchId && { branch: { connect: { id: branchId } } }),
      ...(categoryId && { category: { connect: { id: categoryId } } }),
      ...(subcategoryId && { subcategory: { connect: { id: subcategoryId } } }),
      ...(imageUrl && { imageUrl }),
    };
    return this.productsService.createProduct(createData);
  }

  @Put(':id')
  updateProduct(@Req() req: Request, @Param('id') id: string) {
    if (!id) {
      throw new Error('Product ID is required');
    }
    const body = req.body as Prisma.ProductUpdateInput & {
      branchId?: string;
      imageUrl?: string;
      categoryId?: string;
      subcategoryId?: string;
    };

    // Handle relations and imageUrl update explicitly
    const {
      imageUrl,
      categoryId,
      subcategoryId,
      branchId: _branchId, // Exclude branchId if it's there
      ...productData
    } = body;

    const updateData: Prisma.ProductUpdateInput = {
      ...productData,
      ...(imageUrl !== undefined && { imageUrl }),
      ...(categoryId && { category: { connect: { id: categoryId } } }),
      ...(subcategoryId && { subcategory: { connect: { id: subcategoryId } } }),
    };

    return this.productsService.updateProduct(id, updateData);
  }

  @Delete(':id')
  deleteProduct(@Param('id') id: string) {
    if (!id) {
      throw new Error('Product ID is required');
    }
    return this.productsService.deleteProduct(id);
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
