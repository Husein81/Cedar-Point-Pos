import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { BranchesModule } from './modules/branches/branches.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { RolesGuard } from './modules/common/guards/roles.guard.js';
import { CurrenciesModule } from './modules/currencies/currencies.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { DevicesModule } from './modules/devices/devices.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { ModifierGroupsModule } from './modules/modifier-groups/modifier-groups.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { RecipesModule } from './modules/recipes/recipes.module.js';
import { RefundsModule } from './modules/refunds/refunds.module.js';
import { TablesModule } from './modules/tables/tables.module.js';
import { TenantModule } from './modules/tenant/tenant.module.js';
import { KitchenModule } from './modules/kitchen/kitchen.module.js';
import { TransfersModule } from './modules/transfers/transfers.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { SystemAdminModule } from './modules/system-admin/system-admin.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { FloorsModule } from './modules/floors/floors.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      // Use wildcards to enable event namespacing
      wildcard: false,
      // Set this to `true` to use wildcards
      delimiter: '.',
      // Set this to `true` to emit the newListener event
      newListener: false,
      // Set this to `true` to emit the removeListener event
      removeListener: false,
      // The verbosity level for console logs
      verbosity: false,
      // Ignore errors during event handling
      ignoreErrors: false,
    }),
    PrismaModule,
    AuthModule,
    BranchesModule,
    CategoryModule,
    CurrenciesModule,
    CustomersModule,
    DevicesModule,
    FloorsModule,
    InventoryModule,
    ProductsModule,
    RecipesModule,
    TablesModule,
    TenantModule,
    KitchenModule,
    UsersModule,
    TransfersModule,
    OrdersModule,
    ModifierGroupsModule,
    RefundsModule,
    ReportsModule,
    SystemAdminModule,
  ],
  controllers: [AppController],
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
export class AppModule { }
