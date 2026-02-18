import {
  BadRequestException,
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
  createScheduleDto,
  updateScheduleDto,
  queryScheduleDto,
  publishScheduleDto,
  type CreateScheduleDto,
  type UpdateScheduleDto,
  type QueryScheduleDto,
  type PublishScheduleDto,
} from './dto/schedule.dto.js';

@Controller('shifts/schedules')
export class ShiftScheduleController {
  constructor(private readonly scheduleService: ShiftScheduleService) {}

  /** Validate a Zod schema, throw BadRequestException on failure. */
  private parse<T>(
    schema: {
      safeParse: (
        v: unknown,
      ) =>
        | { success: true; data: T }
        | { success: false; error: { issues: { message: string }[] } };
    },
    value: unknown,
  ): T {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((e) => e.message).join(', '),
      );
    }
    return result.data;
  }

  // ── List Schedules ─────────────────────────────────────────────────────
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Req() req: Request, @Query() rawQuery: QueryScheduleDto) {
    const query = this.parse(queryScheduleDto, rawQuery);
    const user = req.user as { tenantId: string };
    return this.scheduleService.findAll(user.tenantId, query);
  }

  // ── My Schedules (cashier's own view) ──────────────────────────────────
  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  getMySchedules(@Req() req: Request, @Query() rawQuery: QueryScheduleDto) {
    const query = this.parse(queryScheduleDto, rawQuery);
    const user = req.user as { tenantId: string; id: string };
    return this.scheduleService.getMySchedules(user.tenantId, user.id, query);
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
    const dto = this.parse(createScheduleDto, body);
    const user = req.user as { tenantId: string };
    return this.scheduleService.create(user.tenantId, dto);
  }

  // ── Update Schedule ────────────────────────────────────────────────────
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateScheduleDto,
  ) {
    const dto = this.parse(updateScheduleDto, body);
    const user = req.user as { tenantId: string };
    return this.scheduleService.update(user.tenantId, id, dto);
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
    const dto = this.parse(publishScheduleDto, body);
    const user = req.user as { tenantId: string; id: string };
    return this.scheduleService.publish(user.tenantId, user.id, dto.ids);
  }

  // ── Unpublish (bulk) ───────────────────────────────────────────────────
  @Post('unpublish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  unpublish(@Req() req: Request, @Body() body: PublishScheduleDto) {
    const dto = this.parse(publishScheduleDto, body);
    const user = req.user as { tenantId: string };
    return this.scheduleService.unpublish(user.tenantId, dto.ids);
  }
}
