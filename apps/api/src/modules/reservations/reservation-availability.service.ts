import { Injectable } from '@nestjs/common';
import { ACTIVE_RESERVATION_STATUSES, TableStatus } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_DURATION_MINUTES = 90;
/** How far ahead to probe for the next open slot, in minutes. */
const NEXT_SLOT_SCAN_MINUTES = 24 * 60;
const NEXT_SLOT_STEP_MINUTES = 15;

export interface AvailabilityTable {
  id: string;
  name: string;
  tableNumber: number;
  capacity: number;
  status: TableStatus;
}

export interface AvailabilityResult {
  availableTables: AvailabilityTable[];
  unavailableTables: AvailabilityTable[];
  /** Tables that fit the party size and are free — the best picks first. */
  suggestedTables: AvailabilityTable[];
  /** ISO instant of the next free slot for at least one table, or null. */
  nextAvailableTime: string | null;
}

export interface AvailabilityQuery {
  branchId: string;
  startAt: Date;
  durationMinutes?: number;
  guestCount?: number;
  excludeReservationId?: string;
}

/**
 * Table availability for reservations. A table is "unavailable" for a slot if it
 * has an overlapping active reservation OR is currently physically occupied
 * (OCCUPIED / OUT-of-service). Two half-open [start, end) intervals overlap when
 * `aStart < bEnd && bStart < aEnd`.
 */
@Injectable()
export class ReservationAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private endOf(start: Date, durationMinutes: number): Date {
    return new Date(start.getTime() + durationMinutes * 60_000);
  }

  /**
   * Set of tableIds with an active reservation overlapping [start, end) in the
   * branch, excluding one reservation (used when editing an existing booking).
   */
  private async getOverlappingReservedTableIds(
    tenantId: string,
    branchId: string,
    start: Date,
    end: Date,
    excludeReservationId: string | undefined,
    tx?: Prisma.TransactionClient,
  ): Promise<Set<string>> {
    const client = tx ?? this.prisma;

    // Overlap: reservationAt < end AND (reservationAt + duration) > start.
    // durationMinutes is a column, so the "+ duration > start" half is done with
    // a raw interval comparison; the "< end" half narrows the scan via the index.
    const rows = await client.$queryRaw<Array<{ tableId: string }>>`
      SELECT DISTINCT "tableId"
      FROM "Reservation"
      WHERE "tenantId" = ${tenantId}
        AND "branchId" = ${branchId}
        AND "tableId" IS NOT NULL
        AND "deletedAt" IS NULL
        AND "status" = ANY(${[...ACTIVE_RESERVATION_STATUSES]}::"ReservationStatus"[])
        AND "reservationAt" < ${end}
        AND ("reservationAt" + ("durationMinutes" || ' minutes')::interval) > ${start}
        ${
          excludeReservationId
            ? Prisma.sql`AND "id" <> ${excludeReservationId}`
            : Prisma.empty
        }
    `;

    return new Set(rows.map((r) => r.tableId).filter((id): id is string => !!id));
  }

  async checkAvailability(
    tenantId: string,
    query: AvailabilityQuery,
    tx?: Prisma.TransactionClient,
  ): Promise<AvailabilityResult> {
    const client = tx ?? this.prisma;
    const duration = query.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    const start = query.startAt;
    const end = this.endOf(start, duration);

    const tables = await client.table.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        tableNumber: true,
        capacity: true,
        status: true,
      },
      orderBy: { tableNumber: 'asc' },
    });

    const reservedTableIds = await this.getOverlappingReservedTableIds(
      tenantId,
      query.branchId,
      start,
      end,
      query.excludeReservationId,
      tx,
    );

    const availableTables: AvailabilityTable[] = [];
    const unavailableTables: AvailabilityTable[] = [];

    for (const table of tables) {
      const view: AvailabilityTable = {
        id: table.id,
        name: table.name,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status as TableStatus,
      };

      // Physically occupied right now, or already booked for this slot.
      const isOccupiedNow = table.status === TableStatus.OCCUPIED;
      const isReservedForSlot = reservedTableIds.has(table.id);

      if (isOccupiedNow || isReservedForSlot) {
        unavailableTables.push(view);
      } else {
        availableTables.push(view);
      }
    }

    // Suggestions: free tables that fit the party, smallest sufficient first
    // (tightest fit reduces wasted capacity), then by table number.
    const suggestedTables = query.guestCount
      ? availableTables
          .filter((t) => t.capacity >= query.guestCount!)
          .sort(
            (a, b) =>
              a.capacity - b.capacity || a.tableNumber - b.tableNumber,
          )
      : [...availableTables];

    const nextAvailableTime =
      availableTables.length > 0
        ? start.toISOString()
        : await this.findNextAvailableTime(
            tenantId,
            query.branchId,
            start,
            duration,
            query.guestCount,
            query.excludeReservationId,
            tx,
          );

    return {
      availableTables,
      unavailableTables,
      suggestedTables,
      nextAvailableTime,
    };
  }

  /**
   * Scan forward in fixed steps for the first slot where at least one fitting
   * table is free. Bounded by NEXT_SLOT_SCAN_MINUTES so it always terminates.
   */
  private async findNextAvailableTime(
    tenantId: string,
    branchId: string,
    from: Date,
    durationMinutes: number,
    guestCount: number | undefined,
    excludeReservationId: string | undefined,
    tx?: Prisma.TransactionClient,
  ): Promise<string | null> {
    const client = tx ?? this.prisma;

    const tables = await client.table.findMany({
      where: {
        tenantId,
        branchId,
        deletedAt: null,
        isActive: true,
        ...(guestCount ? { capacity: { gte: guestCount } } : {}),
      },
      select: { id: true, status: true },
    });

    // No table can ever fit the party — no point scanning.
    if (tables.length === 0) return null;

    for (
      let offset = NEXT_SLOT_STEP_MINUTES;
      offset <= NEXT_SLOT_SCAN_MINUTES;
      offset += NEXT_SLOT_STEP_MINUTES
    ) {
      const slotStart = new Date(from.getTime() + offset * 60_000);
      const slotEnd = this.endOf(slotStart, durationMinutes);

      const reserved = await this.getOverlappingReservedTableIds(
        tenantId,
        branchId,
        slotStart,
        slotEnd,
        excludeReservationId,
        tx,
      );

      // A future slot only needs to clear reservation overlaps; a currently
      // OCCUPIED table is assumed to have turned over by then.
      const hasFreeTable = tables.some((t) => !reserved.has(t.id));
      if (hasFreeTable) return slotStart.toISOString();
    }

    return null;
  }
}
