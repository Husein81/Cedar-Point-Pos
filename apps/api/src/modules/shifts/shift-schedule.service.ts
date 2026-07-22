import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ShiftScheduleStatus,
  UserRole,
  SHIFT_PATTERN_SENTINEL_DAY,
} from '@repo/types';
import type {
  CreateScheduleDto,
  UpdateScheduleDto,
  QueryScheduleDto,
  QueryScheduleRangeDto,
  CreateRecurringScheduleDto,
} from './dto/schedule.dto.js';

const MS_PER_DAY = 86_400_000;

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

  /** Build a sentinel-anchored timestamp from a wall-clock "HH:MM" string. */
  private sentinelTime(hhmm: string): Date {
    return new Date(`${SHIFT_PATTERN_SENTINEL_DAY}T${hhmm}:00.000Z`);
  }

  /** Minutes since midnight (UTC) for a timestamp — its time-of-day. */
  private minutesOfDay(d: Date): number {
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }

  /** A timestamp on `day` (UTC) carrying the time-of-day of `timeSource`. */
  private applyTimeToDay(day: Date, timeSource: Date): Date {
    return new Date(
      Date.UTC(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        day.getUTCDate(),
        timeSource.getUTCHours(),
        timeSource.getUTCMinutes(),
      ),
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

  /**
   * Validate that the branch, user and (optional) device all exist within the
   * tenant and are usable. Shared by create() and bulkCreate().
   */
  private async validateAssignment(
    tenantId: string,
    branchId: string,
    userId: string,
    deviceId?: string | null,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, isDeleted: false },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (deviceId) {
      const device = await this.prisma.pOSDevice.findFirst({
        where: { id: deviceId, tenantId, branchId, isActive: true },
      });
      if (!device)
        throw new NotFoundException(
          'Device not found or not active in this branch',
        );
    }
  }

  // ── Create ─────────────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateScheduleDto) {
    const { branchId, userId, deviceId, date, startTime, endTime, notes } = dto;

    // Issue #4: Date consistency
    this.validateDateConsistency(date, startTime);

    await this.validateAssignment(tenantId, branchId, userId, deviceId);

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
        breakMinutes: dto.breakMinutes ?? 0,
        notes: notes ?? null,
        status: ShiftScheduleStatus.DRAFT,
      },
      include: this.scheduleInclude,
    });
  }

  // ── Create Recurring (dateless weekly pattern) ─────────────────────────
  async createRecurring(tenantId: string, dto: CreateRecurringScheduleDto) {
    const { branchId, userId, deviceId, daysOfWeek, notes } = dto;

    // Zero-padded HH:MM compares correctly as strings.
    if (dto.endTime <= dto.startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    await this.validateAssignment(tenantId, branchId, userId, deviceId);

    const startTime = this.sentinelTime(dto.startTime);
    const endTime = this.sentinelTime(dto.endTime);
    const effectiveFrom = dto.effectiveFrom
      ? this.startOfDayUTC(dto.effectiveFrom)
      : null;
    const effectiveTo = dto.effectiveTo
      ? this.startOfDayUTC(dto.effectiveTo)
      : null;

    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException(
        'End date must be on or after the start date',
      );
    }

    // Overlap is checked only against other recurring patterns for this user.
    await this.validateRecurringOverlap(
      tenantId,
      userId,
      daysOfWeek,
      startTime,
      endTime,
    );

    return this.prisma.shiftSchedule.create({
      data: {
        tenantId,
        branchId,
        userId,
        deviceId: deviceId ?? null,
        date: null,
        isRecurring: true,
        daysOfWeek,
        effectiveFrom,
        effectiveTo,
        startTime,
        endTime,
        breakMinutes: dto.breakMinutes ?? 0,
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
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    const deviceId =
      dto.deviceId === null ? null : (dto.deviceId ?? existing.deviceId);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

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

    if (existing.isRecurring) {
      // Recurring pattern: no calendar date; validate days + time-of-day.
      const daysOfWeek = dto.daysOfWeek ?? existing.daysOfWeek;
      await this.validateRecurringOverlap(
        tenantId,
        userId,
        daysOfWeek,
        startTime,
        endTime,
        scheduleId,
      );

      // `null` clears a bound (ongoing); `undefined` leaves it unchanged.
      const effectiveFrom =
        dto.effectiveFrom !== undefined
          ? dto.effectiveFrom
            ? this.startOfDayUTC(dto.effectiveFrom)
            : null
          : existing.effectiveFrom;
      const effectiveTo =
        dto.effectiveTo !== undefined
          ? dto.effectiveTo
            ? this.startOfDayUTC(dto.effectiveTo)
            : null
          : existing.effectiveTo;
      if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
        throw new BadRequestException(
          'End date must be on or after the start date',
        );
      }

      return this.prisma.shiftSchedule.update({
        where: { id: scheduleId },
        data: {
          ...(dto.userId && { userId: dto.userId }),
          ...(dto.daysOfWeek && { daysOfWeek: dto.daysOfWeek }),
          ...(dto.effectiveFrom !== undefined && { effectiveFrom }),
          ...(dto.effectiveTo !== undefined && { effectiveTo }),
          ...(dto.startTime && { startTime: dto.startTime }),
          ...(dto.endTime && { endTime: dto.endTime }),
          ...(dto.breakMinutes !== undefined && {
            breakMinutes: dto.breakMinutes,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.deviceId !== undefined && { deviceId }),
        },
        include: this.scheduleInclude,
      });
    }

    // Dated occurrence: keep date/time consistent and check dated overlaps.
    const date = dto.date ?? existing.date;
    if (date) this.validateDateConsistency(date, startTime);

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
        ...(dto.breakMinutes !== undefined && {
          breakMinutes: dto.breakMinutes,
        }),
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

  // ── Cancel (DRAFT | PUBLISHED → CANCELLED) ─────────────────────────────
  async cancel(tenantId: string, scheduleId: string) {
    const existing = await this.prisma.shiftSchedule.findFirst({
      where: { id: scheduleId, tenantId },
    });
    if (!existing) throw new NotFoundException('Schedule not found');

    if (
      existing.status !== ShiftScheduleStatus.DRAFT &&
      existing.status !== ShiftScheduleStatus.PUBLISHED
    ) {
      throw new BadRequestException(
        `Cannot cancel a schedule with status ${existing.status}`,
      );
    }

    return this.prisma.shiftSchedule.update({
      where: { id: scheduleId },
      data: { status: ShiftScheduleStatus.CANCELLED },
      include: this.scheduleInclude,
    });
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

  // ── Shared query building ──────────────────────────────────────────────

  /** Prisma `date` window for [from, to]; `to` is normalized to end-of-day. */
  private dateWindow(from?: Date, to?: Date): Prisma.ShiftScheduleWhereInput {
    if (!from && !to) return {};
    const toInclusive = to
      ? new Date(this.startOfDayUTC(to).getTime() + MS_PER_DAY)
      : undefined;
    return {
      date: {
        ...(from && { gte: this.startOfDayUTC(from) }),
        ...(toInclusive && { lt: toInclusive }),
      },
    };
  }

  /** Run a paginated schedule query with the shared include, ordering, envelope. */
  private async paginate(
    where: Prisma.ShiftScheduleWhereInput,
    page: number,
    limit: number,
  ) {
    const [data, totalCount] = await Promise.all([
      this.prisma.shiftSchedule.findMany({
        where,
        include: this.scheduleInclude,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        skip: (page - 1) * limit,
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

  // ── Find All (with filters + pagination) ───────────────────────────────
  async findAll(tenantId: string, query: QueryScheduleDto) {
    const { branchId, userId, status, from, to, page, limit } = query;
    const where: Prisma.ShiftScheduleWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(userId && { userId }),
      ...(status && { status }),
      ...this.dateWindow(from, to),
    };
    return this.paginate(where, page, limit);
  }

  // ── Find Range (bounded calendar feed, no pagination) ──────────────────
  private static readonly MAX_RANGE_ROWS = 1000;
  private static readonly MAX_PATTERNS = 500;

  async findRange(tenantId: string, query: QueryScheduleRangeDto) {
    const { branchId, userId, from, to } = query;

    const fromDay = this.startOfDayUTC(from);
    const toDay = this.startOfDayUTC(to);
    // Normalize `to` to end-of-day so the full day is included.
    const toInclusive = new Date(toDay.getTime() + MS_PER_DAY);

    // Dated occurrences within the window.
    const dated = await this.prisma.shiftSchedule.findMany({
      where: {
        tenantId,
        isRecurring: false,
        ...(branchId && { branchId }),
        ...(userId && { userId }),
        date: { gte: fromDay, lt: toInclusive },
      },
      include: this.scheduleInclude,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: ShiftScheduleService.MAX_RANGE_ROWS,
    });

    // Recurring patterns to expand across the visible days (bounded — the
    // expansion below is O(patterns × rangeDays), so never load unbounded).
    const patterns = await this.prisma.shiftSchedule.findMany({
      where: {
        tenantId,
        isRecurring: true,
        ...(branchId && { branchId }),
        ...(userId && { userId }),
        status: { not: ShiftScheduleStatus.CANCELLED },
      },
      include: this.scheduleInclude,
      take: ShiftScheduleService.MAX_PATTERNS,
    });

    // A dated shift overrides its pattern for that employee on that day.
    const covered = new Set(
      dated
        .filter((d) => d.date)
        .map((d) => `${d.userId}:${d.date!.toISOString().slice(0, 10)}`),
    );

    const expanded: ((typeof patterns)[number] & { patternId: string })[] = [];
    for (const pattern of patterns) {
      const days = new Set(pattern.daysOfWeek);
      for (
        let cursor = new Date(fromDay);
        cursor <= toDay;
        cursor = new Date(cursor.getTime() + MS_PER_DAY)
      ) {
        if (!days.has(cursor.getUTCDay())) continue;
        // Respect the pattern's optional effective window.
        if (pattern.effectiveFrom && cursor < pattern.effectiveFrom) continue;
        if (pattern.effectiveTo && cursor > pattern.effectiveTo) continue;
        const dateKey = cursor.toISOString().slice(0, 10);
        if (covered.has(`${pattern.userId}:${dateKey}`)) continue;

        expanded.push({
          ...pattern,
          id: `${pattern.id}:${dateKey}`,
          patternId: pattern.id,
          date: new Date(cursor),
          startTime: this.applyTimeToDay(cursor, pattern.startTime),
          endTime: this.applyTimeToDay(cursor, pattern.endTime),
        });
      }
    }

    return [...dated, ...expanded];
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
    const where: Prisma.ShiftScheduleWhereInput = {
      tenantId,
      userId,
      ...(branchId && { branchId }),
      status: { in: statuses },
      ...this.dateWindow(from, to),
    };
    return this.paginate(where, page, limit);
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
    // `isRecurring: false` guarantees a dateless pattern can never be STARTED.
    const result = await client.shiftSchedule.updateMany({
      where: {
        id: scheduleId,
        tenantId,
        isRecurring: false,
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

    // `isRecurring: false` — a dateless pattern is not an openable occurrence,
    // so its id must never resolve here (its sentinel times would misfire).
    const schedule = await client.shiftSchedule.findFirst({
      where: { id: scheduleId, tenantId, isRecurring: false },
    });

    if (!schedule) throw new NotFoundException('Scheduled shift not found');

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

  // ── Overlap Validation (dated occurrences) ─────────────────────────────
  // Only compares against other DATED rows. A dated shift landing on a
  // recurring pattern's weekday is an override, not a conflict (see findRange).
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
        isRecurring: false,
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
          isRecurring: false,
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

  // ── Overlap Validation (recurring patterns) ────────────────────────────
  // Two patterns conflict when they share any weekday AND their time-of-day
  // ranges overlap. Compared in minutes-of-day (both use the sentinel date).
  private async validateRecurringOverlap(
    tenantId: string,
    userId: string,
    daysOfWeek: number[],
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ) {
    const newDays = new Set(daysOfWeek);
    const newStart = this.minutesOfDay(startTime);
    const newEnd = this.minutesOfDay(endTime);

    const patterns = await this.prisma.shiftSchedule.findMany({
      where: {
        tenantId,
        userId,
        isRecurring: true,
        status: { notIn: [ShiftScheduleStatus.CANCELLED] },
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true, daysOfWeek: true, startTime: true, endTime: true },
    });

    for (const pattern of patterns) {
      const sharesDay = pattern.daysOfWeek.some((d) => newDays.has(d));
      if (!sharesDay) continue;

      const existingStart = this.minutesOfDay(pattern.startTime);
      const existingEnd = this.minutesOfDay(pattern.endTime);
      const timesOverlap = existingStart < newEnd && existingEnd > newStart;
      if (timesOverlap) {
        throw new ConflictException({
          message:
            'Pattern overlaps with an existing recurring shift for this user',
          code: 'RECURRING_SCHEDULE_OVERLAP',
          conflictingScheduleId: pattern.id,
        });
      }
    }
  }
}
