import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PrismaService } from './prisma.service.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [
    AppController,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    PrismaService,
  ],
})
export class AppModule {}
