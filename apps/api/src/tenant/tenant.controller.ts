import { Body, Controller, Get, Post } from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { Request } from 'express';
import { TenantService } from './tenant.service';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Roles('ADMIN')
  @Get()
  getTenants() {
    return this.tenantService.getTenants();
  }

  @Roles('ADMIN')
  @Post()
  async createTenant(@Body() body: Prisma.TenantCreateInput) {
    await this.tenantService.createTenant(body);
  }
}
