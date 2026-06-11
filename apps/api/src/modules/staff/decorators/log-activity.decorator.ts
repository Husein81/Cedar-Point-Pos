import { SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export const LOG_ACTIVITY_KEY = 'logActivity';

export interface LogActivityOptions {
  /**
   * Optional predicate evaluated against the incoming request. When provided,
   * the activity is only recorded if it returns true — used for data-conditional
   * events (e.g. only log a status change when it transitions to CANCELLED).
   */
  when?: (req: Request) => boolean;
}

export interface LogActivityMetadata {
  action: string;
  module: string;
  options?: LogActivityOptions;
}

/**
 * Marks a controller handler so the {@link ActivityLogInterceptor} records a
 * StaffActivityLog entry on a successful (2xx) response. The staff, tenant and
 * branch are resolved from the request context, never from the handler.
 *
 * @example
 * @LogActivity(StaffActivityAction.REFUND_CREATED, StaffActivityModule.REFUNDS)
 * createRefund() { ... }
 */
export const LogActivity = (
  action: string,
  module: string,
  options?: LogActivityOptions,
) =>
  SetMetadata<string, LogActivityMetadata>(LOG_ACTIVITY_KEY, {
    action,
    module,
    options,
  });
