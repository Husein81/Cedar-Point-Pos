import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryDeductionService } from './inventory-deduction.service';
import { StockAdjustmentController } from './stock-adjustment.controller';
import { StockAdjustmentService } from './stock-adjustment.service';

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
