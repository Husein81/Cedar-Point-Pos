import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { SystemAdminService } from './system-admin.service.js';
import { CreateTenantDto } from '../prisma/tenant-onboarding.service.js';
import {
  TenantStatus,
  LicenseType,
  BusinessType,
} from '../../generated/prisma/client.js';
import { Public } from '../common/decorators/public.decorator.js';

// =============================================================================
// DTOs
// =============================================================================

class CreateTenantApiDto {
  name!: string;
  slug!: string;
  businessType!: BusinessType;
  adminName!: string;
  adminEmail!: string;
  adminPassword!: string;
  branchName?: string;
  branchAddress?: string;
  settings?: Prisma.InputJsonValue;
}

class UpdateTenantStatusDto {
  status!: TenantStatus;
  reason?: string;
}

class CreateLicenseDto {
  type!: LicenseType;
  maxDevices?: number;
  maxBranches?: number;
  maxUsers?: number;
  expiresAt?: string;
}

// =============================================================================
// CONTROLLER
// =============================================================================

@Controller('system')
@Public() // TODO: replace with SYSTEM_ADMIN auth guard
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  // =========================================================================
  // TENANTS
  // =========================================================================

  @Get('tenants')
  listTenants(
    @Query('status') status?: TenantStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.systemAdminService.getAllTenants({
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('tenants')
  @HttpCode(HttpStatus.CREATED)
  createTenant(@Body() dto: CreateTenantApiDto) {
    const createDto: CreateTenantDto = {
      name: dto.name,
      slug: dto.slug,
      businessType: dto.businessType,
      adminName: dto.adminName,
      adminEmail: dto.adminEmail,
      adminPassword: dto.adminPassword,
      branchName: dto.branchName,
      branchAddress: dto.branchAddress,
      settings: dto.settings,
    };

    return this.systemAdminService.createTenant(createDto);
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.systemAdminService.getTenantById(id);
  }

  @Patch('tenants/:id/status')
  updateTenantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.systemAdminService.updateTenantStatus(id, dto.status);
  }

  @Post('tenants/:id/suspend')
  suspendTenant(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.systemAdminService.suspendTenant(id, dto.reason);
  }

  @Post('tenants/:id/reactivate')
  reactivateTenant(@Param('id') id: string) {
    return this.systemAdminService.reactivateTenant(id);
  }

  // =========================================================================
  // LICENSES
  // =========================================================================

  @Post('tenants/:id/licenses')
  @HttpCode(HttpStatus.CREATED)
  createLicense(@Param('id') tenantId: string, @Body() dto: CreateLicenseDto) {
    return this.systemAdminService.createLicense(tenantId, {
      type: dto.type,
      maxDevices: dto.maxDevices,
      maxBranches: dto.maxBranches,
      maxUsers: dto.maxUsers,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  // =========================================================================
  // SYSTEM
  // =========================================================================

  @Get('stats')
  getStats() {
    return this.systemAdminService.getSystemStats();
  }

  @Get('audit-logs')
  getAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.systemAdminService.getAuditLogs({
      entityType,
      entityId,
      actorId,
      action,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
    };
  }
}
