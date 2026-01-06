import { Module } from '@nestjs/common';
import { TransfersService } from './transfers.service.js';
import { TransfersController } from './transfers.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [InventoryModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
