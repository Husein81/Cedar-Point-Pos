import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service.js';
import { RefundsController } from './refunds.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';

@Module({
  imports: [InventoryModule, LoyaltyModule],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
