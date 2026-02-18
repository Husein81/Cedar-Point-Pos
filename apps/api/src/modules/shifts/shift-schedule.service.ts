import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShiftScheduleStatus, UserRole } from '@repo/types';
import type {
  CreateScheduleDto,
  UpdateScheduleDto,
  QueryScheduleDto,
} from './dto/schedule.dto.js';

@Injectable()
export class ShiftScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly scheduleInclude = {
    branch: { select: { id: true, name: true } },
    user: { select: { id: true, name: true } },
    device: { select: { id: true, name: true } },
    publishedBy: { select: { id: true, name: true } },
  } as const;

  // ── Helpers ────────────────────────────────────────────────────────────

  /** Normalize a Date to midnight UTC (strip time component). */
  private startOfDayUTC(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  /**
   * Validate that `date` matches the calendar day (UTC) of `startTime`.
   * Prevents conflicting date vs timestamp values.
   */
  private validateDateConsistency(date: Date, startTime: Date): void {
    const dateStr = date.toISOString().slice(0, 10);
    const startStr = startTime.toISOString().slice(0, 10);
    if (dateStr !== startStr) {
      throw new BadRequestException(
        `Schedule date (${dateStr}) must match the calendar day of startTime (${startStr})`,
      );
    }
  }

  // ── Create ─────────────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateScheduleDto) {
    const { branchId, userId, deviceId, date, startTime, endTime, notes } = dto;

    // Issue #4: Date consistency
    this.validateDateConsistency(date, startTime);

    // Validate branch
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, isDeleted: false },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    // Validate user
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Validate device (optional)
    if (deviceId) {
      const device = await this.prisma.pOSDevice.findFirst({
        where: { id: deviceId, tenantId, branchId, isActive: true },
      });
      if (!device)
        throw new NotFoundException(
          'Device not found or not active in this branch',
        );
    }

    // Check for overlapping schedules
    await this.validateNoOverlap(
      tenantId,
      userId,
      startTime,
      endTime,
      deviceId,
    );

    return this.prisma.shiftSchedule.create({
      data: {
        tenantId,
        branchId,
        userId,
        deviceId: deviceId ?? null,
        date,
        startTime,
        endTime,
        notes: notes ?? null,
        status: ShiftScheduleStatus.DRAFT,
      },
      include: this.scheduleInclude,
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────
  async update(tenantId: string, scheduleId: string, dto: UpdateScheduleDto) {
    const existing = await this.prisma.shiftSchedule.findFirst({
      where: { id: scheduleId, tenantId },
    });
    if (!existing) throw new NotFoundException('Schedule not found');

    if (
      existing.status === ShiftScheduleStatus.STARTED ||
      existing.status === ShiftScheduleStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot update a schedule with status ${existing.status}`,
      );
    }

    const userId = dto.userId ?? existing.userId;
    const date = dto.date ?? existing.date;
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    const deviceId =
      dto.deviceId === null ? null : (dto.deviceId ?? existing.deviceId);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Issue #4: Date consistency on update
    this.validateDateConsistency(date, startTime);

    // Validate device if changed
    if (dto.deviceId && dto.deviceId !== existing.deviceId) {
      const branchId = existing.branchId;
      const device = await this.prisma.pOSDevice.findFirst({
        where: { id: dto.deviceId, tenantId, branchId, isActive: true },
      });
      if (!device)
        throw new NotFoundException(
          'Device not found or not active in this branch',
        );
    }

    // Validate user if changed
    if (dto.userId && dto.userId !== existing.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, tenantId, isActive: true },
      });
      if (!user) throw new NotFoundException('User not found');
    }

    // Check for overlapping schedules (exclude self)
    await this.validateNoOverlap(
      tenantId,
      userId,
      startTime,
      endTime,
      deviceId,
      scheduleId,
    );

    return this.prisma.shiftSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(dto.userId && { userId: dto.userId }),
        ...(dto.date && { date: dto.date }),
        ...(dto.startTime && { startTime: dto.startTime }),
        ...(dto.endTime && { endTime: dto.endTime }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.deviceId !== undefined && { deviceId }),
      },
      include: this.scheduleInclude,
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  async delete(tenantId: string, scheduleId: string) {
    const existing = await this.prisma.shiftSchedule.findFirst({
      where: { id: scheduleId, tenantId },
    });
    if (!existing) throw new NotFoundException('Schedule not found');

    if (existing.status === ShiftScheduleStatus.STARTED) {
      throw new BadRequestException(
        'Cannot delete a schedule that has already been started',
      );
    }

    await this.prisma.shiftSchedule.delete({
      where: { id: scheduleId },
    });

    return { deleted: true };
  }

  // ── Find One ───────────────────────────────────────────────────────────
  async findOne(
    tenantId: string,
    scheduleId: string,
    caller?: { callerId: string; callerRole: string },
  ) {
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: { id: scheduleId, tenantId },
      include: this.scheduleInclude,
    });
    if (!schedule) throw new NotFoundException('Schedule not found');

    // Issue #1: Cashiers may only read their own schedules
    if (
      caller &&
      caller.callerRole === UserRole.CASHIER &&
      schedule.userId !== caller.callerId
    ) {
      throw new ForbiddenException(
        'You can only view schedules assigned to you',
      );
    }

    return schedule;
  }

  // ── Find All (with filters + pagination) ───────────────────────────────
  async findAll(tenantId: string, query: QueryScheduleDto) {
    const { branchId, userId, status, from, to, page, limit } = query;

    // Issue #5: Normalize `to` to end-of-day so the full day is included
    const toInclusive = to
      ? new Date(
          Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() + 1),
        )
      : undefined;

    const where: Prisma.ShiftScheduleWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(userId && { userId }),
      ...(status && { status }),
      ...(from || toInclusive
        ? {
            date: {
              ...(from && { gte: this.startOfDayUTC(from) }),
              ...(toInclusive && { lt: toInclusive }),
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      this.prisma.shiftSchedule.findMany({
        where,
        include: this.scheduleInclude,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.shiftSchedule.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // ── My Schedules (cashier's own published view) ────────────────────────
  async getMySchedules(
    tenantId: string,
    userId: string,
    query: QueryScheduleDto,
  ) {
    // Issue #2: Reject disallowed statuses for cashiers
    const allowedStatuses: ShiftScheduleStatus[] = [
      ShiftScheduleStatus.PUBLISHED,
      ShiftScheduleStatus.STARTED,
    ];

    if (query.status && !allowedStatuses.includes(query.status)) {
      throw new BadRequestException(
        `Cashiers can only query PUBLISHED or STARTED schedules, got: ${query.status}`,
      );
    }

    const statuses: ShiftScheduleStatus[] = query.status
      ? [query.status]
      : allowedStatuses;

    return this.findAllWithStatusIn(tenantId, {
      ...query,
      userId,
      statuses,
    });
  }

  /**
   * Internal: findAll variant that accepts multiple statuses via `IN`.
   * Used by getMySchedules to default to PUBLISHED + STARTED.
   */
  private async findAllWithStatusIn(
    tenantId: string,
    query: QueryScheduleDto & {
      userId: string;
      statuses: ShiftScheduleStatus[];
    },
  ) {
    const { branchId, userId, statuses, from, to, page, limit } = query;

    const toInclusive = to
      ? new Date(
          Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() + 1),
        )
      : undefined;

    const where: Prisma.ShiftScheduleWhereInput = {
      tenantId,
      userId,
      ...(branchId && { branchId }),
      status: { in: statuses },
      ...(from || toInclusive
        ? {
            date: {
              ...(from && { gte: this.startOfDayUTC(from) }),
              ...(toInclusive && { lt: toInclusive }),
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      this.prisma.shiftSchedule.findMany({
        where,
        include: this.scheduleInclude,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.shiftSchedule.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // ── Publish (bulk) ─────────────────────────────────────────────────────
  async publish(tenantId: string, publisherId: string, ids: string[]) {
    const schedules = await this.prisma.shiftSchedule.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, status: true },
    });

    if (schedules.length !== ids.length) {
      throw new NotFoundException('One or more schedules not found');
    }

    const nonDraft = schedules.filter(
      (s) => s.status !== ShiftScheduleStatus.DRAFT,
    );
    if (nonDraft.length > 0) {
      throw new BadRequestException(
        `Only DRAFT schedules can be published. Invalid: ${nonDraft.map((s) => s.id).join(', ')}`,
      );
    }

    const now = new Date();

    await this.prisma.shiftSchedule.updateMany({
      where: { id: { in: ids }, tenantId },
      data: {
        status: ShiftScheduleStatus.PUBLISHED,
        publishedAt: now,
        publishedById: publisherId,
      },
    });

    return { published: ids.length, ids };
  }

  // ── Unpublish (bulk) ───────────────────────────────────────────────────
  async unpublish(tenantId: string, ids: string[]) {
    const schedules = await this.prisma.shiftSchedule.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, status: true },
    });

    if (schedules.length !== ids.length) {
      throw new NotFoundException('One or more schedules not found');
    }

    const invalid = schedules.filter(
      (s) => s.status !== ShiftScheduleStatus.PUBLISHED,
    );
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Only PUBLISHED schedules can be unpublished. Invalid: ${invalid.map((s) => s.id).join(', ')}`,
      );
    }

    await this.prisma.shiftSchedule.updateMany({
      where: { id: { in: ids }, tenantId },
      data: {
        status: ShiftScheduleStatus.DRAFT,
        publishedAt: null,
        publishedById: null,
      },
    });

    return { unpublished: ids.length, ids };
  }

  // ── Mark schedule as STARTED (called from openShift) ───────────────────
  async markStarted(
    scheduleId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    // Issue #3: Conditional update — only transition PUBLISHED → STARTED.
    // Check affected row count to guarantee exactly-once semantics.
    const result = await client.shiftSchedule.updateMany({
      where: {
        id: scheduleId,
        tenantId,
        status: ShiftScheduleStatus.PUBLISHED,
      },
      data: { status: ShiftScheduleStatus.STARTED },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Schedule has already been started or is no longer in PUBLISHED status',
      );
    }
  }

  // ── Validate scheduled shift for runtime open ──────────────────────────
  async validateForOpen(
    scheduleId: string,
    tenantId: string,
    userId: string,
    branchId: string,
    deviceId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    const schedule = await client.shiftSchedule.findFirst({
      where: { id: scheduleId, tenantId },
    });

    if (!schedule) throw new NotFoundException('Schedule not found');

    if (schedule.status !== ShiftScheduleStatus.PUBLISHED) {
      throw new BadRequestException(
        `Schedule is not in PUBLISHED status (current: ${schedule.status})`,
      );
    }

    if (schedule.userId !== userId) {
      throw new BadRequestException('Schedule is assigned to a different user');
    }

    if (schedule.branchId !== branchId) {
      throw new BadRequestException(
        'Schedule branch does not match the shift branch',
      );
    }

    if (schedule.deviceId && deviceId && schedule.deviceId !== deviceId) {
      throw new BadRequestException(
        'Schedule device does not match the shift device',
      );
    }

    // Check time compatibility: allow opening within 30 minutes before scheduled start
    const now = new Date();
    const earlyThresholdMs = 30 * 60 * 1000; // 30 minutes
    const scheduledStart = new Date(schedule.startTime);
    const earliestOpen = new Date(scheduledStart.getTime() - earlyThresholdMs);
    const scheduledEnd = new Date(schedule.endTime);

    if (now < earliestOpen) {
      throw new BadRequestException(
        `Too early to open shift. Scheduled start: ${scheduledStart.toISOString()}`,
      );
    }

    if (now > scheduledEnd) {
      throw new BadRequestException(
        `Schedule has already ended: ${scheduledEnd.toISOString()}`,
      );
    }

    return schedule;
  }

  // ── Overlap Validation ─────────────────────────────────────────────────
  private async validateNoOverlap(
    tenantId: string,
    userId: string,
    startTime: Date,
    endTime: Date,
    deviceId?: string | null,
    excludeId?: string,
  ) {
    // Check user overlap
    const userOverlap = await this.prisma.shiftSchedule.findFirst({
      where: {
        tenantId,
        userId,
        status: { notIn: [ShiftScheduleStatus.CANCELLED] },
        ...(excludeId && { id: { not: excludeId } }),
        // Overlapping time range: existing.start < new.end AND existing.end > new.start
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true, date: true, startTime: true, endTime: true },
    });

    if (userOverlap) {
      throw new ConflictException({
        message: 'Schedule overlaps with an existing schedule for this user',
        code: 'USER_SCHEDULE_OVERLAP',
        conflictingScheduleId: userOverlap.id,
      });
    }

    // Check device overlap (if device assigned)
    if (deviceId) {
      const deviceOverlap = await this.prisma.shiftSchedule.findFirst({
        where: {
          tenantId,
          deviceId,
          status: { notIn: [ShiftScheduleStatus.CANCELLED] },
          ...(excludeId && { id: { not: excludeId } }),
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: { id: true, date: true, startTime: true, endTime: true },
      });

      if (deviceOverlap) {
        throw new ConflictException({
          message:
            'Schedule overlaps with an existing schedule for this device',
          code: 'DEVICE_SCHEDULE_OVERLAP',
          conflictingScheduleId: deviceOverlap.id,
        });
      }
    }
  }
}
