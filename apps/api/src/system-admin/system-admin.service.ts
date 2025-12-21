import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { SystemPrismaService } from '../prisma/multi-tenant-prisma.service.js';
import {
  TenantOnboardingService,
  CreateTenantDto,
} from '../prisma/tenant-onboarding.service.js';
import { TenantSchemaManager } from '../prisma/tenant-schema.manager.js';
import { TenantStatus, LicenseType } from '../../generated/prisma/client.js';

export interface SystemStats {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    trial: number;
  };
  devices: {
    total: number;
    active: number;
  };
  infrastructure: {
    tenantSchemas: number;
  };
  recentActivity: unknown[];
}

@Injectable()
export class SystemAdminService {
  private readonly logger = new Logger(SystemAdminService.name);

  constructor(
    private readonly systemPrisma: SystemPrismaService,
    private readonly onboardingService: TenantOnboardingService,
    private readonly schemaManager: TenantSchemaManager,
  ) {}

  // =========================================================================
  // TENANT MANAGEMENT
  // =========================================================================

  async getAllTenants(options?: {
    status?: TenantStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, page = 1, limit = 20 } = options ?? {};

    const where: Prisma.TenantWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [tenants, total] = await Promise.all([
      this.systemPrisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          licenses: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { devices: true },
          },
        },
      }),
      this.systemPrisma.tenant.count({ where }),
    ]);

    return {
      data: tenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTenantById(tenantId: string) {
    const tenant = await this.systemPrisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        licenses: true,
        devices: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    return tenant;
  }

  async createTenant(dto: CreateTenantDto) {
    return this.onboardingService.onboardTenant(dto);
  }
  async getSystemStats(): Promise<SystemStats> {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      totalDevices,
      activeDevices,
      recentAuditLogs,
    ] = await Promise.all([
      this.systemPrisma.tenant.count(),
      this.systemPrisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.systemPrisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.systemPrisma.tenant.count({ where: { status: 'TRIAL' } }),
      this.systemPrisma.systemDevice.count(),
      this.systemPrisma.systemDevice.count({ where: { status: 'ACTIVE' } }),
      this.systemPrisma.systemAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const tenantSchemas = await this.schemaManager.listTenantSchemas();

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        trial: trialTenants,
      },
      devices: {
        total: totalDevices,
        active: activeDevices,
      },
      infrastructure: {
        tenantSchemas: tenantSchemas.length,
      },
      recentActivity: recentAuditLogs,
    };
  }

  async updateTenantStatus(
    tenantId: string,
    status: TenantStatus,
    actorId?: string,
  ) {
    const existing = await this.getTenantById(tenantId);

    const updated = await this.systemPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        status,
        suspendedAt: status === 'SUSPENDED' ? new Date() : null,
      },
    });

    await this.systemPrisma.systemAuditLog.create({
      data: {
        action: 'TENANT_STATUS_CHANGED',
        entityType: 'Tenant',
        entityId: tenantId,
        actorId,
        details: {
          previousStatus: existing.status,
          newStatus: status,
        },
      },
    });

    return updated;
  }

  async suspendTenant(tenantId: string, reason?: string, actorId?: string) {
    await this.systemPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        settings: reason ? { suspendReason: reason } : Prisma.DbNull,
      },
    });

    await this.systemPrisma.systemAuditLog.create({
      data: {
        action: 'TENANT_SUSPENDED',
        entityType: 'Tenant',
        entityId: tenantId,
        actorId,
        details: { reason },
      },
    });

    return this.getTenantById(tenantId);
  }

  async reactivateTenant(tenantId: string, actorId?: string) {
    await this.systemPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
      },
    });

    await this.systemPrisma.systemAuditLog.create({
      data: {
        action: 'TENANT_REACTIVATED',
        entityType: 'Tenant',
        entityId: tenantId,
        actorId,
      },
    });

    return this.getTenantById(tenantId);
  }

  // =========================================================================
  // LICENSE MANAGEMENT
  // =========================================================================

  async createLicense(
    tenantId: string,
    data: {
      type: LicenseType;
      maxDevices?: number;
      maxBranches?: number;
      maxUsers?: number;
      expiresAt?: Date;
    },
  ) {
    await this.systemPrisma.license.updateMany({
      where: { tenantId, isActive: true },
      data: { isActive: false },
    });

    return this.systemPrisma.license.create({
      data: {
        tenantId,
        type: data.type,
        maxDevices: data.maxDevices ?? this.getDefaultMaxDevices(data.type),
        maxBranches: data.maxBranches ?? this.getDefaultMaxBranches(data.type),
        maxUsers: data.maxUsers ?? this.getDefaultMaxUsers(data.type),
        expiresAt: data.expiresAt,
        isActive: true,
      },
    });
  }

  private getDefaultMaxDevices(type: LicenseType): number {
    return (
      {
        TRIAL: 1,
        BASIC: 3,
        PROFESSIONAL: 10,
        ENTERPRISE: 100,
      } as const
    )[type];
  }

  private getDefaultMaxBranches(type: LicenseType): number {
    return (
      {
        TRIAL: 1,
        BASIC: 1,
        PROFESSIONAL: 5,
        ENTERPRISE: 50,
      } as const
    )[type];
  }

  private getDefaultMaxUsers(type: LicenseType): number {
    return (
      {
        TRIAL: 3,
        BASIC: 5,
        PROFESSIONAL: 25,
        ENTERPRISE: 500,
      } as const
    )[type];
  }

  // =========================================================================
  // AUDIT LOGS
  // =========================================================================

  async getAuditLogs(options?: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      entityType,
      entityId,
      actorId,
      action,
      page = 1,
      limit = 50,
    } = options ?? {};

    const where: Prisma.SystemAuditLogWhereInput = {
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(actorId && { actorId }),
      ...(action && { action: { contains: action } }),
    };

    const [logs, total] = await Promise.all([
      this.systemPrisma.systemAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.systemPrisma.systemAuditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
