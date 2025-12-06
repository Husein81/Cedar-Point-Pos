import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryDeductionService } from './inventory-deduction.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryDeductionService],
  exports: [InventoryService, InventoryDeductionService],
})
export class InventoryModule {}
