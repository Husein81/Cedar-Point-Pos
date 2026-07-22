import { Module } from '@nestjs/common';
import { ShiftScheduleController } from './shift-schedule.controller.js';
import { ShiftScheduleService } from './shift-schedule.service.js';
import { ShiftsController } from './shifts.controller.js';
import { ShiftsService } from './shifts.service.js';

@Module({
  // Order matters: ShiftScheduleController owns the literal `/shifts/schedules`
  // paths and MUST be registered before ShiftsController, whose `/shifts/:id`
  // param route would otherwise match `/shifts/schedules` first (Express matches
  // in registration order) and 404 as a missing shift. Do not reorder.
  controllers: [ShiftScheduleController, ShiftsController],
  providers: [ShiftsService, ShiftScheduleService],
  exports: [ShiftsService, ShiftScheduleService],
})
export class ShiftsModule {}
