import { Module } from '@nestjs/common';
import { ShiftScheduleController } from './shift-schedule.controller.js';
import { ShiftScheduleService } from './shift-schedule.service.js';
import { ShiftsController } from './shifts.controller.js';
import { ShiftsService } from './shifts.service.js';

@Module({
  controllers: [ShiftsController, ShiftScheduleController],
  providers: [ShiftsService, ShiftScheduleService],
  exports: [ShiftsService, ShiftScheduleService],
})
export class ShiftsModule {}
