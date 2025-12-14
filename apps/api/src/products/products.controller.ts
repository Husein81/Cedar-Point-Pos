import { Controller, Delete, Get, Post, Put, Req } from '@nestjs/common';
import { QueryParams } from '@repo/types';
import type { Request } from 'express';
import { ProductsService } from './products.service';

type PrismaProductCreateInput = Record<string, unknown>;
type PrismaProductUpdateInput = Record<string, unknown>;

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getProductsByTenant(@Req() req: Request) {
    const { tenantId } = req.user as { tenantId: string };
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.productsService.getProductsByTenant(tenantId);
  }

  @Get('/paginated')
  getProductsPaginated(@Req() req: Request) {
    const { tenantId } = req.user as { tenantId: string };
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    const query = req.query as QueryParams;

    return this.productsService.getProductsPaginated(tenantId, query);
  }

  @Post()
  createProduct(@Req() req: Request) {
    const body = req.body as PrismaProductCreateInput;
    return this.productsService.createProduct(body);
  }

  @Put('/:id')
  updateProduct(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Product ID is required');
    }
    const body = req.body as PrismaProductUpdateInput;
    return this.productsService.updateProduct(id, body);
  }

  @Delete('/:id')
  deleteProduct(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Product ID is required');
    }
    return this.productsService.deleteProduct(id);
  }

  @Get('/:id/modifiers')
  getModifiersByProduct(@Req() req: Request) {
    const { id: productId } = req.params;
    const { tenantId } = req.user as { tenantId: string };

    if (!productId) {
      throw new Error('Product ID is required');
    }

    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    return this.productsService.getModifiersByProduct(productId, tenantId);
  }
}
