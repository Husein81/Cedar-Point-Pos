import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EXPIRABLE_RESERVATION_STATUSES,
  ReservationStatus,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';

/** Grace period after the reservation time before it auto-expires to NO_SHOW. */
const NO_SHOW_GRACE_MINUTES = 30;
/** Lead time for the "arriving soon" heads-up. */
const ARRIVING_SOON_LEAD_MINUTES = 30;
/** Width of the arriving-soon window each tick (matches the tick interval). */
const ARRIVING_SOON_WINDOW_MINUTES = 5;

/**
 * Background sweeps for reservations. Cron jobs are system-level (not
 * tenant-scoped) and query across all tenants, mutating only rows the sweep
 * owns. Side effects are limited to a status flip + an in-process event that a
 * gateway/notifier forwards to the right branch room.
 */
@Injectable()
export class ReservationSchedulerService {
  private readonly logger = new Logger(ReservationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Every 5 minutes, expire PENDING/CONFIRMED bookings whose time + grace has
   * passed to NO_SHOW. ARRIVED/SEATED are never auto-expired (guest is present).
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStaleReservations(): Promise<void> {
    const cutoff = new Date(Date.now() - NO_SHOW_GRACE_MINUTES * 60_000);

    const stale = await this.prisma.reservation.findMany({
      where: {
        deletedAt: null,
        status: { in: [...EXPIRABLE_RESERVATION_STATUSES] },
        reservationAt: { lt: cutoff },
      },
      select: { id: true, tenantId: true, branchId: true },
    });

    if (stale.length === 0) return;

    // Guard the transition atomically: only flip rows still in an expirable
    // status, so a concurrent seat/arrive isn't clobbered.
    const staleIds = stale.map((r) => r.id);
    const result = await this.prisma.reservation.updateMany({
      where: {
        id: { in: staleIds },
        status: { in: [...EXPIRABLE_RESERVATION_STATUSES] },
      },
      data: { status: ReservationStatus.NO_SHOW },
    });

    this.logger.log(`Auto-expired ${result.count} reservation(s) to NO_SHOW`);

    for (const r of stale) {
      this.eventEmitter.emit('reservation.no_show', {
        tenantId: r.tenantId,
        branchId: r.branchId,
        reservationId: r.id,
        auto: true,
      });
    }
  }

  /**
   * Every 5 minutes, emit an "arriving soon" heads-up for confirmed guests due
   * in ~30 minutes. The window equals the tick interval so each reservation
   * fires once. Purely a notification hook — no data mutation.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async notifyArrivingSoon(): Promise<void> {
    const now = Date.now();
    const windowStart = new Date(now + ARRIVING_SOON_LEAD_MINUTES * 60_000);
    const windowEnd = new Date(
      now +
        (ARRIVING_SOON_LEAD_MINUTES + ARRIVING_SOON_WINDOW_MINUTES) * 60_000,
    );

    const arriving = await this.prisma.reservation.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
        reservationAt: { gte: windowStart, lt: windowEnd },
      },
      select: { id: true, tenantId: true, branchId: true, reservationAt: true },
    });

    for (const r of arriving) {
      this.eventEmitter.emit('reservation.arriving_soon', {
        tenantId: r.tenantId,
        branchId: r.branchId,
        reservationId: r.id,
        reservationAt: r.reservationAt.toISOString(),
      });
    }
  }
}
