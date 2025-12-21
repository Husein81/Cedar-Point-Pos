// =============================================================================
// TENANT ONBOARDING SERVICE
// =============================================================================

import {
  Injectable,
  Logger,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { SystemPrismaService } from './multi-tenant-prisma.service.js';
import { TenantSchemaManager } from './tenant-schema.manager.js';
import { DatabasePoolService } from './multi-tenant-prisma.service.js';
import { BusinessType, TenantStatus } from '../../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateTenantDto {
  name: string;
  slug: string;
  businessType: BusinessType;
  settings?: Prisma.InputJsonValue;

  adminName: string;
  adminEmail: string;
  adminPassword: string;

  branchName?: string;
  branchAddress?: string;
}

export interface OnboardingResult {
  tenantId: string;
  schemaName: string;
  status: TenantStatus;
  adminUserId?: string;
  branchId?: string;
}

// =============================================================================
// SERVICE
// =============================================================================

@Injectable()
export class TenantOnboardingService {
  private readonly logger = new Logger(TenantOnboardingService.name);

  constructor(
    private readonly systemPrisma: SystemPrismaService,
    private readonly schemaManager: TenantSchemaManager,
    private readonly dbPool: DatabasePoolService,
  ) {}

  async onboardTenant(dto: CreateTenantDto): Promise<OnboardingResult> {
    this.logger.log(`Starting onboarding for tenant: ${dto.name}`);

    const existingTenant = await this.systemPrisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existingTenant) {
      if (existingTenant.status === 'ONBOARDING') {
        return this.resumeOnboarding(existingTenant.id);
      }
      throw new ConflictException(
        `Tenant with slug '${dto.slug}' already exists`,
      );
    }

    const tenantId = this.generateTenantId();
    const schemaName = this.schemaManager.generateSchemaName(tenantId);

    const tenant = await this.systemPrisma.tenant.create({
      data: {
        id: tenantId,
        name: dto.name,
        slug: dto.slug,
        businessType: dto.businessType,
        schemaName,
        status: 'ONBOARDING',
        settings: dto.settings || {},
      },
    });

    try {
      await this.schemaManager.createSchema(schemaName);
      await this.schemaManager.applyTenantSchema(schemaName);

      const { adminUserId, branchId } = await this.createInitialData(
        schemaName,
        dto,
      );

      await this.systemPrisma.tenant.update({
        where: { id: tenant.id },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });

      await this.systemPrisma.systemAuditLog.create({
        data: {
          action: 'TENANT_ONBOARDED',
          entityType: 'Tenant',
          entityId: tenant.id,
          details: {
            name: dto.name,
            slug: dto.slug,
            schemaName,
            businessType: dto.businessType,
          },
        },
      });

      return {
        tenantId: tenant.id,
        schemaName,
        status: 'ACTIVE',
        adminUserId,
        branchId,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Onboarding failed for tenant ${tenant.id}: ${message}`,
      );

      await this.systemPrisma.tenant.update({
        where: { id: tenant.id },
        data: {
          settings: {
            ...(tenant.settings as Record<string, unknown>),
            onboardingError: message,
            onboardingFailedAt: new Date().toISOString(),
          },
        },
      });

      throw new InternalServerErrorException(
        `Tenant onboarding failed: ${message}`,
      );
    }
  }

  async resumeOnboarding(tenantId: string): Promise<OnboardingResult> {
    const tenant = await this.systemPrisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.status !== 'ONBOARDING') {
      throw new Error('Invalid tenant onboarding state');
    }

    const exists = await this.schemaManager.schemaExists(tenant.schemaName);

    if (!exists) {
      await this.schemaManager.createSchema(tenant.schemaName);
      await this.schemaManager.applyTenantSchema(tenant.schemaName);
    }

    await this.systemPrisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    return {
      tenantId: tenant.id,
      schemaName: tenant.schemaName,
      status: 'ACTIVE',
    };
  }

  private async createInitialData(
    schemaName: string,
    dto: CreateTenantDto,
  ): Promise<{ adminUserId: string; branchId?: string }> {
    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
    const adminUserId = this.generateId();
    const branchId = dto.branchName ? this.generateId() : undefined;

    await this.dbPool.queryWithSchema(
      schemaName,
      `
      INSERT INTO "User" ("id","name","email","password","role","isActive")
      VALUES ($1,$2,$3,$4,'OWNER',true)
    `,
      [adminUserId, dto.adminName, dto.adminEmail, hashedPassword],
    );

    if (dto.branchName && branchId) {
      await this.dbPool.queryWithSchema(
        schemaName,
        `
        INSERT INTO "Branch" ("id","name","address")
        VALUES ($1,$2,$3)
      `,
        [branchId, dto.branchName, dto.branchAddress ?? null],
      );
    }

    await this.dbPool.queryWithSchema(
      schemaName,
      `
      INSERT INTO "Currency" ("code","name","symbol","isActive")
      VALUES ('USD','United States Dollar','$',true)
      ON CONFLICT ("code") DO NOTHING
    `,
    );

    return { adminUserId, branchId };
  }

  private generateTenantId(): string {
    return `c${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  private generateId(): string {
    return `c${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
}
