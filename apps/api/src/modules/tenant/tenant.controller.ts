import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { TenantService } from './tenant.service.js';

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
  createTenant(@Body() body: CreateTenantDto) {
    return this.tenantService.createTenant(body);
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Put(':id')
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
  @Put('my-tenant')
  updateMyTenant(
    @CurrentTenant() tenantId: string,
    @Body() body: UpdateTenantDto,
  ) {
    return this.tenantService.updateTenant(tenantId, body);
  }
}
