import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DevicesModule } from '../devices/devices.module.js';

@Module({
  imports: [PrismaModule, DevicesModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
