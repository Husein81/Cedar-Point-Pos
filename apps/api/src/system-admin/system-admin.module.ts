// =============================================================================
// SYSTEM ADMIN MODULE
// =============================================================================
//
// This module provides system-level administration endpoints:
// - Tenant management (create, suspend, reactivate)
// - License management
// - System health and metrics
//
// These endpoints operate on the PUBLIC schema and do NOT require tenant context.
// =============================================================================

import { Module } from '@nestjs/common';
import { SystemAdminController } from './system-admin.controller.js';
import { SystemAdminService } from './system-admin.service.js';

@Module({
  controllers: [SystemAdminController],
  providers: [SystemAdminService],
  exports: [SystemAdminService],
})
export class SystemAdminModule {}
