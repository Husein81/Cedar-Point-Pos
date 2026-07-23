import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { KitchenGateway } from '../kitchen/kitchen.gateway.js';

interface ReservationEventPayload {
  tenantId: string;
  branchId: string;
  reservationId: string;
  [key: string]: unknown;
}

/**
 * Bridges in-process reservation.* events to the branch Socket.IO room via the
 * shared KitchenGateway (the one gateway that owns the `branch_{id}` rooms).
 * Forward-only: the payload names the lifecycle event and the reservation;
 * clients refetch their reservation lists and may surface a toast. Mirrors the
 * KitchenService @OnEvent bridge pattern.
 */
@Injectable()
export class ReservationEventsListener {
  constructor(private readonly kitchenGateway: KitchenGateway) {}

  @OnEvent('reservation.created')
  onCreated(payload: ReservationEventPayload) {
    this.forward('reservation.created', payload);
  }

  @OnEvent('reservation.updated')
  onUpdated(payload: ReservationEventPayload) {
    this.forward('reservation.updated', payload);
  }

  @OnEvent('reservation.arrived')
  onArrived(payload: ReservationEventPayload) {
    this.forward('reservation.arrived', payload);
  }

  @OnEvent('reservation.seated')
  onSeated(payload: ReservationEventPayload) {
    this.forward('reservation.seated', payload);
  }

  @OnEvent('reservation.completed')
  onCompleted(payload: ReservationEventPayload) {
    this.forward('reservation.completed', payload);
  }

  @OnEvent('reservation.cancelled')
  onCancelled(payload: ReservationEventPayload) {
    this.forward('reservation.cancelled', payload);
  }

  @OnEvent('reservation.no_show')
  onNoShow(payload: ReservationEventPayload) {
    this.forward('reservation.no_show', payload);
  }

  @OnEvent('reservation.arriving_soon')
  onArrivingSoon(payload: ReservationEventPayload) {
    this.forward('reservation.arriving_soon', payload);
  }

  private forward(event: string, payload: ReservationEventPayload): void {
    const { branchId, reservationId, ...rest } = payload;
    this.kitchenGateway.emitReservationChanged(branchId, event, {
      reservationId,
      ...rest,
    });
  }
}
