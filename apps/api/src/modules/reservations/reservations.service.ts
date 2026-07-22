import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ACTIVE_RESERVATION_STATUSES,
  OrderType,
  ReservationSource,
  ReservationStatus,
  SortOrder,
  TableStatus,
} from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { TableStatusService } from '../tables/table-status.service.js';
import { ReservationAvailabilityService } from './reservation-availability.service.js';
import { assertReservationTransition } from './reservation-status.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import type { UpdateReservationDto } from './dto/update-reservation.dto.js';
import type { ReservationQueryDto } from './dto/reservation-query.dto.js';
import type { SeatReservationDto } from './dto/seat-reservation.dto.js';

const DEFAULT_DURATION_MINUTES = 90;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Columns a client may sort the list by, mapped to Prisma orderBy keys. */
const SORTABLE_FIELDS = new Set([
  'reservationAt',
  'reservationDate',
  'createdAt',
  'customerName',
  'guestCount',
  'status',
]);

/** Relations returned with a reservation for UI display. */
const RESERVATION_INCLUDE = {
  table: { select: { id: true, name: true, tableNumber: true, capacity: true } },
  customer: { select: { id: true, name: true, phone: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  order: {
    select: { id: true, orderNumber: true, status: true, total: true },
  },
} satisfies Prisma.ReservationInclude;

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: ReservationAvailabilityService,
    private readonly ordersService: OrdersService,
    private readonly tableStatusService: TableStatusService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Compose the reservation start instant from a calendar day + "HH:mm". The
   * date's Y/M/D are taken in local server time and the time-of-day applied, so
   * reservationAt reflects the wall-clock the staff entered.
   */
  private composeReservationAt(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map((v) => Number(v));
    const at = new Date(date);
    at.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    return at;
  }

  /** Midnight (local) of the given date — used to store the date-only column. */
  private toDateOnly(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private resolvePagination(page?: number, limit?: number) {
    const resolvedPage = page && page > 0 ? page : 1;
    const resolvedLimit = Math.min(
      limit && limit > 0 ? limit : DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    return {
      page: resolvedPage,
      limit: resolvedLimit,
      skip: (resolvedPage - 1) * resolvedLimit,
    };
  }

  /**
   * Reservation number: RES-YYMMDD-BRANCH-####, per branch/day, via an
   * upsert-increment on ReservationSequence (mirrors OrderSequence). Runs inside
   * the caller's transaction so the number and the row commit atomically.
   */
  private async generateReservationNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    branchId: string,
    branchName: string,
    date: Date,
  ): Promise<string> {
    const dateStr = this.formatDateCode(date);
    const branchCode = branchName
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 3);

    const sequence = await tx.reservationSequence.upsert({
      where: { branchId_date: { branchId, date: dateStr } },
      update: { lastValue: { increment: 1 } },
      create: { tenantId, branchId, date: dateStr, lastValue: 1 },
    });

    const seq = sequence.lastValue.toString().padStart(4, '0');
    return `RES-${dateStr}-${branchCode}-${seq}`;
  }

  private formatDateCode(date: Date): string {
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /** Load a reservation scoped to tenant, or throw. */
  private async getScopedOrThrow(id: string, tenantId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: RESERVATION_INCLUDE,
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  /** Verify a branch belongs to the tenant; return its name for number-gen. */
  private async assertBranch(
    tenantId: string,
    branchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ name: string }> {
    const client = tx ?? this.prisma;
    const branch = await client.branch.findFirst({
      where: { id: branchId, tenantId, isDeleted: false },
      select: { name: true },
    });
    if (!branch) throw new BadRequestException('Branch not found');
    return branch;
  }

  /**
   * Ensure a chosen table exists in the branch, fits the party, and has no
   * conflicting reservation for the slot. Throws a coded conflict otherwise.
   */
  private async assertTableFreeForSlot(
    tenantId: string,
    branchId: string,
    tableId: string,
    startAt: Date,
    durationMinutes: number,
    guestCount: number,
    excludeReservationId: string | undefined,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const result = await this.availability.checkAvailability(
      tenantId,
      {
        branchId,
        startAt,
        durationMinutes,
        guestCount,
        excludeReservationId,
      },
      tx,
    );

    const isAvailable = result.availableTables.some((t) => t.id === tableId);
    if (isAvailable) return;

    const existsInBranch =
      result.availableTables.some((t) => t.id === tableId) ||
      result.unavailableTables.some((t) => t.id === tableId);

    if (!existsInBranch) {
      throw new BadRequestException('Table not found in this branch');
    }

    throw new ConflictException({
      message: 'Table is not available for the selected time',
      code: 'TABLE_NOT_AVAILABLE',
      nextAvailableTime: result.nextAvailableTime,
    });
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(
    { tenantId, userId }: { tenantId: string; userId?: string },
    dto: CreateReservationDto,
  ) {
    const duration = dto.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    const reservationAt = this.composeReservationAt(
      dto.reservationDate,
      dto.reservationTime,
    );
    const reservationDate = this.toDateOnly(dto.reservationDate);

    const branch = await this.assertBranch(tenantId, dto.branchId);

    // Validate a linked customer belongs to the tenant, if provided.
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) throw new BadRequestException('Customer not found');
    }

    // If a table is pre-assigned, it must be free for the slot.
    if (dto.tableId) {
      await this.assertTableFreeForSlot(
        tenantId,
        dto.branchId,
        dto.tableId,
        reservationAt,
        duration,
        dto.guestCount,
        undefined,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const reservationNumber = await this.generateReservationNumber(
        tx,
        tenantId,
        dto.branchId,
        branch.name,
        reservationDate,
      );

      return tx.reservation.create({
        data: {
          reservationNumber,
          tenantId,
          branchId: dto.branchId,
          customerId: dto.customerId ?? null,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerEmail: dto.customerEmail ?? null,
          tableId: dto.tableId ?? null,
          guestCount: dto.guestCount,
          reservationDate,
          reservationTime: dto.reservationTime,
          reservationAt,
          durationMinutes: duration,
          source: dto.source ?? ReservationSource.PHONE,
          notes: dto.notes ?? null,
          status: ReservationStatus.PENDING,
          createdById: userId ?? null,
        },
        include: RESERVATION_INCLUDE,
      });
    });

    this.emit('reservation.created', tenantId, created.branchId, created.id);
    return created;
  }

  // ---------------------------------------------------------------------------
  // Read / list
  // ---------------------------------------------------------------------------

  async findOne(id: string, tenantId: string) {
    return this.getScopedOrThrow(id, tenantId);
  }

  async findAll(tenantId: string, query: ReservationQueryDto) {
    const { page, limit, skip } = this.resolvePagination(
      query.page,
      query.limit,
    );

    const where = this.buildWhere(tenantId, query);
    const orderBy = this.buildOrderBy(query.sort, query.order);

    const [totalCount, data] = await this.prisma.$transaction([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        include: RESERVATION_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
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

  private buildWhere(
    tenantId: string,
    query: ReservationQueryDto,
  ): Prisma.ReservationWhereInput {
    const where: Prisma.ReservationWhereInput = { tenantId, deletedAt: null };

    if (query.branchId) where.branchId = query.branchId;
    if (query.tableId) where.tableId = query.tableId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;
    if (query.source) where.source = query.source;
    if (query.createdById) where.createdById = query.createdById;
    if (query.reservationNumber) {
      where.reservationNumber = {
        contains: query.reservationNumber,
        mode: Prisma.QueryMode.insensitive,
      };
    }
    if (query.phone) {
      where.customerPhone = {
        contains: query.phone,
        mode: Prisma.QueryMode.insensitive,
      };
    }

    if (query.fromDate || query.toDate) {
      where.reservationDate = {};
      if (query.fromDate)
        where.reservationDate.gte = this.toDateOnly(query.fromDate);
      if (query.toDate)
        where.reservationDate.lte = this.toDateOnly(query.toDate);
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        {
          reservationNumber: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          customerName: { contains: search, mode: Prisma.QueryMode.insensitive },
        },
        {
          customerPhone: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sort?: string,
    order?: SortOrder,
  ): Prisma.ReservationOrderByWithRelationInput[] {
    const direction: Prisma.SortOrder = order === SortOrder.DESC ? 'desc' : 'asc';
    const field = sort && SORTABLE_FIELDS.has(sort) ? sort : 'reservationAt';
    return [{ [field]: direction }, { id: 'asc' }];
  }

  /** Reservations whose calendar day is today, ordered by time. */
  async findToday(tenantId: string, branchId?: string) {
    const start = this.toDateOnly(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.prisma.reservation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
        reservationAt: { gte: start, lt: end },
      },
      include: RESERVATION_INCLUDE,
      orderBy: [{ reservationAt: 'asc' }, { id: 'asc' }],
    });
  }

  /** Active reservations from now forward. */
  async findUpcoming(tenantId: string, branchId?: string) {
    return this.prisma.reservation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
        status: { in: [...ACTIVE_RESERVATION_STATUSES] },
        reservationAt: { gte: new Date() },
      },
      include: RESERVATION_INCLUDE,
      orderBy: [{ reservationAt: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Calendar view: reservations for a single day grouped by tableId then hour.
   * The client renders a day schedule (rows = tables, columns = hours).
   */
  async findCalendar(tenantId: string, date: Date, branchId?: string) {
    const start = this.toDateOnly(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
        reservationAt: { gte: start, lt: end },
      },
      include: RESERVATION_INCLUDE,
      orderBy: [{ reservationAt: 'asc' }],
    });

    const byTable: Record<string, typeof reservations> = {};
    const byHour: Record<number, typeof reservations> = {};

    for (const r of reservations) {
      const tableKey = r.tableId ?? 'unassigned';
      (byTable[tableKey] ??= []).push(r);
      const hour = new Date(r.reservationAt).getHours();
      (byHour[hour] ??= []).push(r);
    }

    return {
      date: start.toISOString(),
      reservations,
      byTable,
      byHour,
    };
  }

  // ---------------------------------------------------------------------------
  // Update / delete
  // ---------------------------------------------------------------------------

  async update(id: string, tenantId: string, dto: UpdateReservationDto) {
    const existing = await this.getScopedOrThrow(id, tenantId);

    // Recompute the slot instant when date/time change.
    const nextDateRaw = dto.reservationDate ?? existing.reservationDate;
    const nextTime = dto.reservationTime ?? existing.reservationTime;
    const nextDuration = dto.durationMinutes ?? existing.durationMinutes;
    const reservationAt = this.composeReservationAt(nextDateRaw, nextTime);
    const reservationDate = this.toDateOnly(nextDateRaw);

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) throw new BadRequestException('Customer not found');
    }

    // If a status change is requested via PATCH, only side-effect-free
    // transitions are honored here; the lifecycle endpoints own the rest.
    if (dto.status && dto.status !== existing.status) {
      assertReservationTransition(existing.status, dto.status);
      if (
        dto.status === ReservationStatus.SEATED ||
        dto.status === ReservationStatus.COMPLETED
      ) {
        throw new BadRequestException({
          message:
            'Use the dedicated seat/complete endpoints for this status change',
          code: 'USE_LIFECYCLE_ENDPOINT',
        });
      }
    }

    // Re-validate table availability if the table or the slot changed.
    const nextTableId =
      dto.tableId !== undefined ? dto.tableId : existing.tableId;
    const slotChanged =
      reservationAt.getTime() !== existing.reservationAt.getTime() ||
      nextDuration !== existing.durationMinutes;
    const guestCount = dto.guestCount ?? existing.guestCount;

    if (nextTableId && (dto.tableId !== undefined || slotChanged)) {
      await this.assertTableFreeForSlot(
        tenantId,
        existing.branchId,
        nextTableId,
        reservationAt,
        nextDuration,
        guestCount,
        existing.id,
      );
    }

    const updated = await this.prisma.reservation.update({
      where: { id: existing.id },
      data: {
        customerId: dto.customerId ?? existing.customerId,
        customerName: dto.customerName ?? existing.customerName,
        customerPhone: dto.customerPhone ?? existing.customerPhone,
        customerEmail:
          dto.customerEmail !== undefined
            ? dto.customerEmail
            : existing.customerEmail,
        tableId: nextTableId,
        guestCount,
        reservationDate,
        reservationTime: nextTime,
        reservationAt,
        durationMinutes: nextDuration,
        source: dto.source ?? existing.source,
        status: dto.status ?? existing.status,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
      },
      include: RESERVATION_INCLUDE,
    });

    this.emit('reservation.updated', tenantId, updated.branchId, updated.id);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const existing = await this.getScopedOrThrow(id, tenantId);

    await this.prisma.reservation.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Reservation deleted successfully' };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle actions
  // ---------------------------------------------------------------------------

  /** PENDING/CONFIRMED/… → ARRIVED (guest is on-site). */
  async arrive(id: string, tenantId: string) {
    const existing = await this.getScopedOrThrow(id, tenantId);
    assertReservationTransition(existing.status, ReservationStatus.ARRIVED);

    const updated = await this.prisma.reservation.update({
      where: { id: existing.id },
      data: { status: ReservationStatus.ARRIVED },
      include: RESERVATION_INCLUDE,
    });

    this.emit('reservation.arrived', tenantId, updated.branchId, updated.id);
    return updated;
  }

  /**
   * Seat the reservation: create a dine-in Order, assign & occupy the table,
   * link the order, and move the reservation to SEATED. All post-order steps run
   * in one transaction; the order itself is created via OrdersService (its own
   * post-commit side effects stay intact).
   */
  async seat(
    id: string,
    { tenantId, userId }: { tenantId: string; userId: string },
    dto: SeatReservationDto,
  ) {
    const existing = await this.getScopedOrThrow(id, tenantId);
    assertReservationTransition(existing.status, ReservationStatus.SEATED);

    const tableId = dto.tableId ?? existing.tableId;
    if (!tableId) {
      throw new BadRequestException({
        message: 'A table must be assigned to seat this reservation',
        code: 'RESERVATION_TABLE_REQUIRED',
      });
    }

    if (existing.orderId) {
      throw new ConflictException({
        message: 'Reservation is already linked to an order',
        code: 'RESERVATION_ALREADY_SEATED',
      });
    }

    // Create the dine-in order (empty; staff add items on the POS). This reuses
    // the canonical order-creation flow — table validation, number generation,
    // and its post-commit side effects all live there.
    const order = await this.ordersService.create(
      { tenantId, userId },
      {
        branchId: existing.branchId,
        type: OrderType.DINE_IN,
        tableId,
        customerId: existing.customerId ?? undefined,
        guestCount: existing.guestCount,
        deviceId: dto.deviceId,
        shiftId: dto.shiftId,
      },
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.tableStatusService.updateTableStatus(
        tableId,
        TableStatus.OCCUPIED,
        tenantId,
        tx,
      );

      return tx.reservation.update({
        where: { id: existing.id },
        data: {
          status: ReservationStatus.SEATED,
          tableId,
          orderId: order.id,
        },
        include: RESERVATION_INCLUDE,
      });
    });

    this.emit('reservation.seated', tenantId, updated.branchId, updated.id);
    return updated;
  }

  /** SEATED → COMPLETED (service finished). Table release follows the order. */
  async complete(id: string, tenantId: string) {
    const existing = await this.getScopedOrThrow(id, tenantId);
    assertReservationTransition(existing.status, ReservationStatus.COMPLETED);

    const updated = await this.prisma.reservation.update({
      where: { id: existing.id },
      data: { status: ReservationStatus.COMPLETED },
      include: RESERVATION_INCLUDE,
    });

    this.emit('reservation.completed', tenantId, updated.branchId, updated.id);
    return updated;
  }

  /** → CANCELLED with an optional reason. Releases a reserved-but-empty table. */
  async cancel(id: string, tenantId: string, reason?: string) {
    const existing = await this.getScopedOrThrow(id, tenantId);
    assertReservationTransition(existing.status, ReservationStatus.CANCELLED);

    const updated = await this.prisma.reservation.update({
      where: { id: existing.id },
      data: {
        status: ReservationStatus.CANCELLED,
        cancellationReason: reason ?? null,
      },
      include: RESERVATION_INCLUDE,
    });

    this.emit('reservation.cancelled', tenantId, updated.branchId, updated.id);
    return updated;
  }

  /** PENDING/CONFIRMED/ARRIVED → NO_SHOW (guest never seated). */
  async markNoShow(id: string, tenantId: string) {
    const existing = await this.getScopedOrThrow(id, tenantId);
    assertReservationTransition(existing.status, ReservationStatus.NO_SHOW);

    const updated = await this.prisma.reservation.update({
      where: { id: existing.id },
      data: { status: ReservationStatus.NO_SHOW },
      include: RESERVATION_INCLUDE,
    });

    this.emit('reservation.no_show', tenantId, updated.branchId, updated.id);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Events (in-process; a gateway/notifier forwards to clients)
  // ---------------------------------------------------------------------------

  private emit(
    event: string,
    tenantId: string,
    branchId: string,
    reservationId: string,
  ): void {
    this.eventEmitter.emit(event, { tenantId, branchId, reservationId });
  }
}
