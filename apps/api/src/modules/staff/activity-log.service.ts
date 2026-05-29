import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface RecordActivityInput {
  staffId: string;
  tenantId: string;
  branchId?: string | null;
  action: string;
  module: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Single writer for the StaffActivityLog audit trail. Keeping all writes here
 * (instead of scattering `prisma.staffActivityLog.create` across modules) keeps
 * the audit shape consistent and the responsibility in one place.
 */
@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Persist an audit entry. Throws if the write fails. */
  async record(input: RecordActivityInput): Promise<void> {
    await this.prisma.staffActivityLog.create({
      data: {
        staffId: input.staffId,
        tenantId: input.tenantId,
        branchId: input.branchId ?? null,
        action: input.action,
        module: input.module,
        metadata: input.metadata,
      },
    });
  }

  /**
   * Persist an audit entry without ever throwing. Audit logging is a secondary
   * concern — it must never break the business operation that triggered it.
   */
  async recordSafe(input: RecordActivityInput): Promise<void> {
    try {
      await this.record(input);
    } catch (error) {
      this.logger.warn(
        `Failed to record staff activity "${input.action}" for staff ${input.staffId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
