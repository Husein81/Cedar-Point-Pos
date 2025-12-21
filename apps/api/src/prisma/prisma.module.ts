// =============================================================================
// MULTI-TENANT PRISMA MODULE
// =============================================================================
//
// This module provides the complete multi-tenant database infrastructure:
//
// SERVICES PROVIDED:
// - SystemPrismaService: Access to global/public schema tables
// - TenantPrismaService: Request-scoped access to tenant-specific data
// - DatabasePoolService: Raw pg pool for DDL operations
// - TenantSchemaManager: Create/manage tenant PostgreSQL schemas
// - TenantOnboardingService: Complete tenant provisioning workflow
// - PrismaService: Legacy service (for backward compatibility during migration)
//
// MIDDLEWARE:
// - TenantContextMiddleware: Extracts tenant from request, sets search_path
//
// USAGE:
// 1. Import PrismaModule in your feature modules
// 2. Inject SystemPrismaService for global data (tenants, licenses)
// 3. Inject TenantPrismaService for tenant-scoped data (users, orders, etc.)
// 4. The middleware automatically routes queries to the correct schema
// =============================================================================

import {
  Global,
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import {
  SystemPrismaService,
  TenantPrismaService,
  DatabasePoolService,
} from './multi-tenant-prisma.service.js';
import { TenantContextMiddleware } from './tenant-context.middleware.js';
import { TenantSchemaManager } from './tenant-schema.manager.js';
import { TenantOnboardingService } from './tenant-onboarding.service.js';

// Re-export for convenience
export { PrismaService }; // Legacy - keep for backward compatibility
export { SystemPrismaService, TenantPrismaService, DatabasePoolService };
export { TenantSchemaManager };
export { TenantOnboardingService };
export { TenantContextMiddleware };
export type { TenantContext } from './multi-tenant-prisma.service.js';

@Global()
@Module({
  providers: [
    // Legacy service (for backward compatibility)
    PrismaService,

    // Core database services
    SystemPrismaService,
    TenantPrismaService,
    DatabasePoolService,

    // Schema management
    TenantSchemaManager,
    TenantOnboardingService,
  ],
  exports: [
    // Legacy
    PrismaService,

    // Multi-tenant services
    SystemPrismaService,
    TenantPrismaService,
    DatabasePoolService,
    TenantSchemaManager,
    TenantOnboardingService,
  ],
})
export class PrismaModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant context middleware to all routes except system routes
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        // Public/system routes that don't require tenant context
        { path: 'health', method: RequestMethod.ALL },
        { path: 'api/health', method: RequestMethod.ALL },
        { path: 'auth/login', method: RequestMethod.ALL },
        { path: 'auth/register', method: RequestMethod.ALL },
        { path: 'system/(.*)', method: RequestMethod.ALL },
        { path: 'admin/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
