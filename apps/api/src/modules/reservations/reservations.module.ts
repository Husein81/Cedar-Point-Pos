import { Module } from '@nestjs/common';
import { KitchenModule } from '../kitchen/kitchen.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { TablesModule } from '../tables/tables.module.js';
import { ReservationAvailabilityService } from './reservation-availability.service.js';
import { ReservationEventsListener } from './reservation-events.listener.js';
import { ReservationSchedulerService } from './reservation-scheduler.service.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [OrdersModule, TablesModule, KitchenModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationAvailabilityService,
    ReservationSchedulerService,
    ReservationEventsListener,
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
