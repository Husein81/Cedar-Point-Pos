import { Module } from '@nestjs/common';
import { KitchenService } from './kitchen.service.js';
import { KitchenController } from './kitchen.controller.js';
import { OrdersModule } from '../orders/orders.module.js';
import { KitchenGateway } from './kitchen.gateway.js';

@Module({
  imports: [OrdersModule],
  controllers: [KitchenController],
  providers: [KitchenService, KitchenGateway],
  exports: [KitchenService, KitchenGateway],
})
export class KitchenModule {}
