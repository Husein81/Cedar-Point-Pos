import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service.js';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

/**
 * Owns staff management plus the audit-log service. The global
 * ActivityLogInterceptor that consumes `@LogActivity` is registered once in
 * AppModule (it must be a single global binding, not per-feature-module);
 * ActivityLogService is exported so that binding can inject it.
 */
@Module({
  controllers: [StaffController],
  providers: [StaffService, ActivityLogService],
  exports: [ActivityLogService],
})
export class StaffModule {}
