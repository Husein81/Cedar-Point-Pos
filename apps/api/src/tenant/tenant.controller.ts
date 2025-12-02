import { Controller, Get, Post, Req } from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { Request } from 'express';
import { TenantService } from './tenant.service';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  getTenants() {
    return this.tenantService.getTenants();
  }

  @Post()
  async createTenant(@Req() request: Request) {
    const body = request.body as Prisma.TenantCreateInput;
    await this.tenantService.createTenant(body);
  }
}
