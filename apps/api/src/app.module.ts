import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { BranchesModule } from './branches/branches.module.js';
import { CategoryModule } from './category/category.module.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { CurrenciesModule } from './currencies/currencies.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { ModifierGroupsModule } from './modifier-groups/modifier-groups.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ProductsModule } from './products/products.module.js';
import { RecipesModule } from './recipes/recipes.module.js';
import { RefundsModule } from './refunds/refunds.module.js';
import { TablesModule } from './tables/tables.module.js';
import { TaxModule } from './tax/tax.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { TransfersModule } from './transfers/transfers.module.js';
import { UsersModule } from './users/users.module.js';
import { SystemAdminModule } from './system-admin/system-admin.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReportsModule } from './reports/reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    BranchesModule,
    CategoryModule,
    CurrenciesModule,
    CustomersModule,
    DevicesModule,
    InventoryModule,
    ProductsModule,
    RecipesModule,
    TablesModule,
    TaxModule,
    TenantModule,
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
export class AppModule {}
