import { BadRequestException } from '@nestjs/common';
import { ReservationStatus } from '@repo/types';
import { assertReservationTransition } from './reservation-status.js';

/**
 * Pure state-machine logic — no Prisma, no Nest DI. Exercised as a decision
 * table so the reservation lifecycle is locked down against regressions.
 */
describe('reservation-status', () => {
  const S = ReservationStatus;

  // Every legal from → to transition the machine must permit.
  const allowed: Array<[ReservationStatus, ReservationStatus]> = [
    [S.PENDING, S.CONFIRMED],
    [S.PENDING, S.ARRIVED],
    [S.PENDING, S.SEATED],
    [S.PENDING, S.CANCELLED],
    [S.PENDING, S.NO_SHOW],
    [S.CONFIRMED, S.ARRIVED],
    [S.CONFIRMED, S.SEATED],
    [S.CONFIRMED, S.CANCELLED],
    [S.CONFIRMED, S.NO_SHOW],
    [S.ARRIVED, S.SEATED],
    [S.ARRIVED, S.CANCELLED],
    [S.ARRIVED, S.NO_SHOW],
    [S.SEATED, S.COMPLETED],
    [S.SEATED, S.CANCELLED],
  ];

  it.each(allowed)('allows %s → %s', (from, to) => {
    expect(() => assertReservationTransition(from, to)).not.toThrow();
  });

  it.each<ReservationStatus>([
    S.PENDING,
    S.CONFIRMED,
    S.ARRIVED,
    S.SEATED,
    S.COMPLETED,
    S.CANCELLED,
    S.NO_SHOW,
  ])('treats same-status %s as a no-op', (status) => {
    expect(() => assertReservationTransition(status, status)).not.toThrow();
  });

  // Representative illegal transitions the machine must reject.
  const rejected: Array<[ReservationStatus, ReservationStatus]> = [
    [S.PENDING, S.COMPLETED], // can't complete before seating
    [S.ARRIVED, S.PENDING], // no going backwards
    [S.SEATED, S.NO_SHOW], // a seated guest is present
    [S.COMPLETED, S.CANCELLED], // terminal
    [S.CANCELLED, S.PENDING], // terminal
    [S.NO_SHOW, S.CONFIRMED], // terminal
  ];

  it.each(rejected)('rejects %s → %s', (from, to) => {
    expect(() => assertReservationTransition(from, to)).toThrow(
      BadRequestException,
    );
  });
});
