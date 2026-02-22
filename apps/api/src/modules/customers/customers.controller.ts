import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { QueryParams } from '@repo/types';
import type { Request } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { CustomersService } from './customers.service.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('paginated')
  async getCustomersPaginated(
    @Req() req: Request & { user: { tenantId: string } },
  ) {
    const { tenantId } = req.user;
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    const query = req.query as QueryParams;

    return await this.customersService.getCustomersPaginated(tenantId, query);
  }

  /**
   * Search customers by name or phone
   */
  @Get('search')
  async searchCustomers(
    @Req() req: Request,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    return await this.customersService.searchCustomers(
      tenantId,
      query,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get(':id')
  getCustomer(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as { tenantId: string };
    return this.customersService.getCustomer(tenantId, id);
  }

  @Get(':id/orders')
  getCustomerOrders(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as { tenantId: string };
    const query = req.query as QueryParams;
    return this.customersService.getCustomerOrders(tenantId, id, query);
  }

  @Post()
  createCustomer(
    @Req() req: Request,
    @Body() body: Prisma.CustomerCreateInput,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.customersService.createCustomer(tenantId, body);
  }

  @Put(':id')
  updateCustomer(
    @Param('id') id: string,
    @Body() body: Prisma.CustomerUpdateInput,
  ) {
    return this.customersService.updateCustomer(id, body);
  }

  @Delete(':id')
  deleteCustomer(@Param('id') id: string) {
    return this.customersService.deleteCustomer(id);
  }
}
