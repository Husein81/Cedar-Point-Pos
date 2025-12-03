import { Controller, Delete, Get, Post, Put, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { Request } from 'express';
import { Prisma } from '@repo/db';

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
    const { page, limit, search, sort, order } = req.query as {
      page?: string;
      limit?: string;
      search?: string;
      sort?: string;
      order?: 'asc' | 'desc';
    };

    return this.productsService.getProductsPaginated(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      sort,
      order,
    });
  }

  @Post()
  createProduct(@Req() req: Request) {
    const body = req.body as Prisma.ProductCreateInput;
    return this.productsService.createProduct(body);
  }

  @Put('/:id')
  updateProduct(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Product ID is required');
    }
    const body = req.body as Prisma.ProductUpdateInput;
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
}
