import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { BranchesModule } from './branches/branches.module';
import { CategoryModule } from './category/category.module';
import { RolesGuard } from './common/guards/roles.guard';
import { InventoryModule } from './inventory/inventory.module';
import { ProductsModule } from './products/products.module';
import { DevicesModule } from './devices/devices.module';
import { RecipesModule } from './recipes/recipes.module';
import { TablesModule } from './tables/tables.module';
import { TenantModule } from './tenant/tenant.module';
import { UsersModule } from './users/users.module';
import { TransfersModule } from './transfers/transfers.module';
import { OrdersModule } from './orders/orders.module';
import { ModifierGroupsModule } from './modifier-groups/modifier-groups.module';
import { RefundsModule } from './refunds/refunds.module';

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
