import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserRole } from '@repo/types';
import { TenantService } from './tenant.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Prisma } from '../../generated/prisma/client.js';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Roles(UserRole.SYSTEM_ADMIN)
  @Get()
  getTenants() {
    return this.tenantService.getTenants();
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Post()
  async createTenant(@Body() body: Prisma.TenantCreateInput) {
    await this.tenantService.createTenant(body);
  }
}
