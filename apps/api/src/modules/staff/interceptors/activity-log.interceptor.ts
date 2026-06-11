import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ActivityLogService } from '../activity-log.service.js';
import {
  LOG_ACTIVITY_KEY,
  type LogActivityMetadata,
} from '../decorators/log-activity.decorator.js';

interface AuthedRequest extends Request {
  user?: { id?: string; tenantId?: string; branchId?: string | null };
}

/**
 * Records a StaffActivityLog entry for any handler annotated with
 * {@link LogActivity}, on a successful response. Registered globally; a no-op
 * for handlers without the decorator. Audit writes are fire-and-forget and can
 * never break or delay the response.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly activityLog: ActivityLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const meta = this.reflector.get<LogActivityMetadata | undefined>(
      LOG_ACTIVITY_KEY,
      context.getHandler(),
    );

    if (!meta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const staffId = req.user?.id;
    const tenantId = req.user?.tenantId;

    // Activity is tenant-scoped staff action; skip unauthenticated/system calls.
    if (!staffId || !tenantId) {
      return next.handle();
    }

    if (meta.options?.when && !meta.options.when(req)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result) => {
        void this.activityLog.recordSafe({
          staffId,
          tenantId,
          branchId: this.resolveBranchId(req, result),
          action: meta.action,
          module: meta.module,
          metadata: this.buildMetadata(req, result),
        });
      }),
    );
  }

  /** Best-effort branch resolution from the result, then the request. */
  private resolveBranchId(req: AuthedRequest, result: unknown): string | null {
    const fromResult =
      isRecord(result) && typeof result.branchId === 'string'
        ? result.branchId
        : undefined;
    const fromBody =
      isRecord(req.body) && typeof req.body.branchId === 'string'
        ? req.body.branchId
        : undefined;
    const fromQuery =
      typeof req.query?.branchId === 'string' ? req.query.branchId : undefined;
    return fromResult ?? fromBody ?? fromQuery ?? req.user?.branchId ?? null;
  }

  /** Generic, non-sensitive audit context. Never captures bodies wholesale. */
  private buildMetadata(
    req: AuthedRequest,
    result: unknown,
  ): Prisma.InputJsonValue {
    const resourceId =
      isRecord(result) && typeof result.id === 'string'
        ? result.id
        : typeof req.params?.id === 'string'
          ? req.params.id
          : undefined;

    return {
      method: req.method,
      // Path only — query strings can carry incidental data and add no audit value.
      path: req.originalUrl.split('?')[0] ?? req.originalUrl,
      params: (req.params ?? {}) as Record<string, string>,
      ...(resourceId ? { resourceId } : {}),
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
