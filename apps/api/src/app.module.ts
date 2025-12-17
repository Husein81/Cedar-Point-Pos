import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { BranchesModule } from './branches/branches.module.js';
import { CategoryModule } from './category/category.module.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { ProductsModule } from './products/products.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { RecipesModule } from './recipes/recipes.module.js';
import { TablesModule } from './tables/tables.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { UsersModule } from './users/users.module.js';
import { TransfersModule } from './transfers/transfers.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ModifierGroupsModule } from './modifier-groups/modifier-groups.module.js';
import { RefundsModule } from './refunds/refunds.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    BranchesModule,
    CategoryModule,
    DevicesModule,
    InventoryModule,
    ProductsModule,
    RecipesModule,
    TablesModule,
    TenantModule,
    UsersModule,
    TransfersModule,
    OrdersModule,
    ModifierGroupsModule,
    RefundsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
