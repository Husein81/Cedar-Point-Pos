import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service.js';
import { RefundsController } from './refunds.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ShiftsModule } from '../shifts/shifts.module.js';

@Module({
  imports: [InventoryModule, ShiftsModule],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
