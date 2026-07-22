import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import { TenantService } from './tenant.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
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
  @Get(':id')
  getTenantById(@Param('id') id: string) {
    return this.tenantService.getTenantById(id);
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Get(':id/users')
  getTenantUsers(@Param('id') id: string) {
    return this.tenantService.getTenantUsers(id);
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createTenant(@Body() body: Prisma.TenantCreateInput) {
    return this.tenantService.createTenant(body);
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Patch(':id')
  updateTenant(@Param('id') id: string, @Body() body: UpdateTenantDto) {
    return this.tenantService.updateTenant(id, body);
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteTenant(@Param('id') id: string) {
    return this.tenantService.deleteTenant(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch('my-tenant')
  updateMyTenant(
    @CurrentTenant() tenantId: string,
    @Body() body: Prisma.TenantUpdateInput,
  ) {
    return this.tenantService.updateTenant(tenantId, body);
  }
}
