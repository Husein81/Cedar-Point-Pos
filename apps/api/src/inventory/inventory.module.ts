import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { InventoryDeductionService } from './inventory-deduction.service.js';
import { StockAdjustmentController } from './stock-adjustment.controller.js';
import { StockAdjustmentService } from './stock-adjustment.service.js';

@Module({
  controllers: [InventoryController, StockAdjustmentController],
  providers: [
    InventoryService,
    InventoryDeductionService,
    StockAdjustmentService,
  ],
  exports: [
    InventoryService,
    InventoryDeductionService,
    StockAdjustmentService,
  ],
})
export class InventoryModule {}
