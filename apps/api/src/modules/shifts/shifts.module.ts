import { Module } from '@nestjs/common';
import { ShiftScheduleController } from './shift-schedule.controller.js';
import { ShiftScheduleService } from './shift-schedule.service.js';
import { ShiftsController } from './shifts.controller.js';
import { ShiftsService } from './shifts.service.js';

@Module({
  // Register schedules controller first so `/shifts/schedules` routes
  // are not shadowed by `ShiftsController` dynamic `GET /shifts/:id`.
  controllers: [ShiftScheduleController, ShiftsController],
  providers: [ShiftsService, ShiftScheduleService],
  exports: [ShiftsService, ShiftScheduleService],
})
export class ShiftsModule {}
