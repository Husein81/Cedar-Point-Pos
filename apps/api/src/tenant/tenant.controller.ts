import { Controller, Get, Post, Req } from '@nestjs/common';
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
  async createTenant(@Req() request: Request) {
    const body = request.body as Prisma.TenantCreateInput;
    await this.tenantService.createTenant(body);
  }
}
