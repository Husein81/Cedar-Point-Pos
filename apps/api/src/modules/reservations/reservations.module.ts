import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { TablesModule } from '../tables/tables.module.js';
import { ReservationAvailabilityService } from './reservation-availability.service.js';
import { ReservationSchedulerService } from './reservation-scheduler.service.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [OrdersModule, TablesModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationAvailabilityService,
    ReservationSchedulerService,
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
