import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { TablesModule } from '../tables/tables.module.js';
import { OrderItemController } from './order-item.controller.js';
import { OrderItemService } from './order-item.service.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [InventoryModule, TablesModule],
  controllers: [OrdersController, OrderItemController],
  providers: [OrdersService, OrderItemService],
  exports: [OrdersService],
})
export class OrdersModule { }
