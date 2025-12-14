import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderItemService } from './order-item.service';
import { OrderItemController } from './order-item.controller';
import { InventoryModule } from '@/inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [OrdersController, OrderItemController],
  providers: [OrdersService, OrderItemService],
  exports: [OrdersService],
})
export class OrdersModule {}
