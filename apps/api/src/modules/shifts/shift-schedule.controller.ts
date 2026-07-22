import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ShiftScheduleService } from './shift-schedule.service.js';
import {
  CreateRecurringScheduleDto,
  CreateScheduleDto,
  PublishScheduleDto,
  QueryScheduleDto,
  QueryScheduleRangeDto,
  UpdateScheduleDto,
} from './dto/schedule.dto.js';

@Controller('shifts/schedules')
export class ShiftScheduleController {
  constructor(private readonly scheduleService: ShiftScheduleService) {}

  // ── List Schedules ─────────────────────────────────────────────────────
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Req() req: Request, @Query() query: QueryScheduleDto) {
    const user = req.user as { tenantId: string };
    return this.scheduleService.findAll(user.tenantId, query);
  }

  // ── My Schedules (cashier's own view) ──────────────────────────────────
  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  getMySchedules(@Req() req: Request, @Query() query: QueryScheduleDto) {
    const user = req.user as { tenantId: string; id: string };
    return this.scheduleService.getMySchedules(user.tenantId, user.id, query);
  }

  // ── Range (bounded calendar feed) ──────────────────────────────────────
  // Declared before `:id` so the literal segment matches first.
  @Get('range')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findRange(@Req() req: Request, @Query() query: QueryScheduleRangeDto) {
    const user = req.user as { tenantId: string };
    return this.scheduleService.findRange(user.tenantId, query);
  }

  // ── Get Schedule By ID ─────────────────────────────────────────────────
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string; id: string; role: string };
    return this.scheduleService.findOne(user.tenantId, id, {
      callerId: user.id,
      callerRole: user.role,
    });
  }

  // ── Create Schedule ────────────────────────────────────────────────────
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Req() req: Request, @Body() body: CreateScheduleDto) {
    const user = req.user as { tenantId: string };
    return this.scheduleService.create(user.tenantId, body);
  }

  // ── Create Recurring (dateless weekly pattern) ─────────────────────────
  @Post('recurring')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createRecurring(
    @Req() req: Request,
    @Body() body: CreateRecurringScheduleDto,
  ) {
    const user = req.user as { tenantId: string };
    return this.scheduleService.createRecurring(user.tenantId, body);
  }

  // ── Update Schedule ────────────────────────────────────────────────────
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateScheduleDto,
  ) {
    const user = req.user as { tenantId: string };
    return this.scheduleService.update(user.tenantId, id, body);
  }

  // ── Cancel Schedule (DRAFT | PUBLISHED → CANCELLED) ────────────────────
  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  cancel(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.scheduleService.cancel(user.tenantId, id);
  }

  // ── Delete Schedule ────────────────────────────────────────────────────
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  delete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.scheduleService.delete(user.tenantId, id);
  }

  // ── Publish (bulk) ─────────────────────────────────────────────────────
  @Post('publish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  publish(@Req() req: Request, @Body() body: PublishScheduleDto) {
    const user = req.user as { tenantId: string; id: string };
    return this.scheduleService.publish(user.tenantId, user.id, body.ids);
  }

  // ── Unpublish (bulk) ───────────────────────────────────────────────────
  @Post('unpublish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  unpublish(@Req() req: Request, @Body() body: PublishScheduleDto) {
    const user = req.user as { tenantId: string };
    return this.scheduleService.unpublish(user.tenantId, body.ids);
  }
}
