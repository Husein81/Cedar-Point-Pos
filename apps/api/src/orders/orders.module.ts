import { InventoryModule } from '../inventory/inventory.module.js';
import { Module } from '@nestjs/common';
import { OrderItemController } from './order-item.controller.js';
import { OrderItemService } from './order-item.service.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { TaxService } from './tax.service.js';

@Module({
  imports: [InventoryModule],
  controllers: [OrdersController, OrderItemController],
  providers: [OrdersService, OrderItemService, TaxService],
  exports: [OrdersService],
})
export class OrdersModule {}
