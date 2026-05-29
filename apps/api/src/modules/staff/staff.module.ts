import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityLogService } from './activity-log.service.js';
import { ActivityLogInterceptor } from './interceptors/activity-log.interceptor.js';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

@Module({
  controllers: [StaffController],
  providers: [
    StaffService,
    ActivityLogService,
    // Global so any handler annotated with @LogActivity is audited, regardless
    // of which module it lives in.
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
  ],
  exports: [ActivityLogService],
})
export class StaffModule {}
