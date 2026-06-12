import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { ActivityLogInterceptor } from './modules/staff/interceptors/activity-log.interceptor.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { BranchesModule } from './modules/branches/branches.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { ColorModule } from './modules/color/color.module.js';
import { RolesGuard } from './modules/common/guards/roles.guard.js';
import { CurrenciesModule } from './modules/currencies/currencies.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { DevicesModule } from './modules/devices/devices.module.js';
import { FloorsModule } from './modules/floors/floors.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { KitchenModule } from './modules/kitchen/kitchen.module.js';
import { LoyaltyModule } from './modules/loyalty/loyalty.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { ModifierGroupsModule } from './modules/modifier-groups/modifier-groups.module.js';
import { OffersModule } from './modules/offers/offers.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { RefundsModule } from './modules/refunds/refunds.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module.js';
import { SuppliersModule } from './modules/suppliers/suppliers.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { SystemAdminModule } from './modules/system-admin/system-admin.module.js';
import { TablesModule } from './modules/tables/tables.module.js';
import { TenantModule } from './modules/tenant/tenant.module.js';
import { TransfersModule } from './modules/transfers/transfers.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ShiftsModule } from './modules/shifts/shifts.module.js';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    BranchesModule,
    CategoryModule,
    ColorModule,
    CurrenciesModule,
    CustomersModule,
    DevicesModule,
    FloorsModule,
    InventoryModule,
    ProductsModule,
    PurchaseOrdersModule,
    SuppliersModule,
    TablesModule,
    TenantModule,
    KitchenModule,
    LoyaltyModule,
    MediaModule,
    UsersModule,
    TransfersModule,
    OrdersModule,
    ModifierGroupsModule,
    OffersModule,
    RefundsModule,
    ReportsModule,
    ShiftsModule,
    StaffModule,
    SystemAdminModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Intentionally global: an APP_INTERCEPTOR is applied to every handler no
    // matter where it is declared, so it lives here (a single binding) rather
    // than in StaffModule. It is a no-op for handlers without `@LogActivity`,
    // only doing a cheap Reflector lookup per request. Injects ActivityLogService,
    // which StaffModule exports.
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
  ],
})
export class AppModule {}
