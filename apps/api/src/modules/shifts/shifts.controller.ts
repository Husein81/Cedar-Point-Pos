import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { StaffActivityAction, StaffActivityModule, UserRole } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { LogActivity } from '../staff/decorators/log-activity.decorator.js';
import { ShiftsService } from './shifts.service.js';
import { openShiftDto, type OpenShiftDto } from './dto/open-shift.dto.js';
import {
  createCashMovementDto,
  type CreateCashMovementDto,
} from './dto/cash-movement.dto.js';
import {
  closePreviewDto,
  closeShiftDto,
  approveCloseDto,
  type ClosePreviewDto,
  type CloseShiftDto,
  type ApproveCloseDto,
} from './dto/close-shift.dto.js';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

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

  /**
   * Open a new shift
   * POST /shifts/open
   */
  @Post('open')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @LogActivity(StaffActivityAction.SHIFT_OPENED, StaffActivityModule.SHIFTS)
  openShift(@Req() req: Request, @Body() body: OpenShiftDto) {
    const dto = this.parse(openShiftDto, body);
    const user = req.user as { tenantId: string; id: string };
    return this.shiftsService.openShift(user.tenantId, user.id, dto);
  }

  /**
   * Get current open shift
   * GET /shifts/current?deviceId=xxx&branchId=xxx
   */
  @Get('current')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  getCurrentShift(
    @Req() req: Request,
    @Query('deviceId') deviceId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.shiftsService.getCurrentShift(
      user.tenantId,
      deviceId,
      branchId,
    );
  }

  /**
   * List shifts with pagination
   * GET /shifts?branchId=&status=&page=1&limit=20
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(
    @Req() req: Request,
    @Query('branchId') branchId?: string,
    @Query('deviceId') deviceId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.shiftsService.findAll(user.tenantId, {
      branchId,
      deviceId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * Get shift by ID
   * GET /shifts/:id
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.shiftsService.findOne(user.tenantId, id);
  }

  /**
   * Close preview — compute expected cash and variance info
   * POST /shifts/:id/close-preview
   */
  @Post(':id/close-preview')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  closePreview(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ClosePreviewDto,
  ) {
    const dto = this.parse(closePreviewDto, body);
    const user = req.user as { tenantId: string };
    return this.shiftsService.closePreview(user.tenantId, id, dto);
  }

  /**
   * Close a shift
   * POST /shifts/:id/close
   */
  @Post(':id/close')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @LogActivity(StaffActivityAction.SHIFT_CLOSED, StaffActivityModule.SHIFTS)
  closeShift(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: CloseShiftDto,
  ) {
    const dto = this.parse(closeShiftDto, body);
    const user = req.user as { tenantId: string; id: string };
    return this.shiftsService.closeShift(user.tenantId, user.id, id, dto);
  }

  /**
   * Manager approval for over-threshold shift close
   * POST /shifts/:id/approve-close
   */
  @Post(':id/approve-close')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  approveClose(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ApproveCloseDto,
  ) {
    const dto = this.parse(approveCloseDto, body);
    const user = req.user as { tenantId: string; id: string; role: string };
    return this.shiftsService.approveClose(
      user.tenantId,
      user.id,
      user.role,
      id,
      dto,
    );
  }

  /**
   * X Report — live mid-shift snapshot
   * GET /shifts/:id/x-report
   */
  @Get(':id/x-report')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  getXReport(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.shiftsService.getXReport(user.tenantId, id);
  }

  /**
   * Create a manual cash movement
   * POST /shifts/:id/cash-movements
   */
  @Post(':id/cash-movements')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @LogActivity(StaffActivityAction.DRAWER_OPENED, StaffActivityModule.SHIFTS)
  createCashMovement(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: CreateCashMovementDto,
  ) {
    const dto = this.parse(createCashMovementDto, body);
    const user = req.user as { tenantId: string; id: string };
    return this.shiftsService.createCashMovement(
      user.tenantId,
      user.id,
      id,
      dto,
    );
  }
}
