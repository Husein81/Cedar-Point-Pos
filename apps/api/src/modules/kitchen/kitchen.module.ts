import { Module } from '@nestjs/common';
import { KitchenService } from './kitchen.service.js';
import { KitchenController } from './kitchen.controller.js';
import { OrdersModule } from '../orders/orders.module.js';

@Module({
  imports: [OrdersModule],
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService],
})
export class KitchenModule {}
