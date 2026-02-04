import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller.js';
import { TablesService } from './tables.service.js';
import { TableStatusService } from './table-status.service.js';

@Module({
  controllers: [TablesController],
  providers: [TablesService, TableStatusService],
  exports: [TablesService, TableStatusService],
})
export class TablesModule {}
