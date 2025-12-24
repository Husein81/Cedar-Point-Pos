import { Controller, Delete, Get, Post, Put, Req } from '@nestjs/common';
import { QueryParams } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { TaxService } from './tax.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  getTaxes(@Req() req: Request) {
    const { tenantId } = req.user as { tenantId: string };
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    return this.taxService.getTaxesByTenant(tenantId);
  }

  @Get('/paginated')
  getTaxesPaginated(@Req() req: Request) {
    const { tenantId } = req.user as { tenantId: string };
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    const query = req.query as QueryParams;
    return this.taxService.getTaxesPaginated(tenantId, query);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  createTax(@Req() req: Request) {
    const body = req.body as Prisma.TaxCreateInput;
    const { tenantId } = req.user as { tenantId: string };
    return this.taxService.createTax({
      ...body,
      tenant: { connect: { id: tenantId } },
    });
  }

  @Roles('OWNER', 'MANAGER')
  @Put('/:id')
  updateTax(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Tax ID is required');
    }
    const body = req.body as Prisma.TaxUpdateInput;
    return this.taxService.updateTax(id, body);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete('/:id')
  deleteTax(@Req() req: Request) {
    const { id } = req.params;
    if (!id) {
      throw new Error('Tax ID is required');
    }
    return this.taxService.deleteTax(id);
  }
}
