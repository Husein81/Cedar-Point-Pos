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
import {
  StaffActivityAction,
  StaffActivityModule,
  UserRole,
} from '@repo/types';
import type { Request } from 'express';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { LogActivity } from '../staff/decorators/log-activity.decorator.js';
import { CheckAvailabilityDto } from './dto/check-availability.dto.js';
import { CancelReservationDto } from './dto/cancel-reservation.dto.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ReservationQueryDto } from './dto/reservation-query.dto.js';
import { SeatReservationDto } from './dto/seat-reservation.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';
import { ReservationAvailabilityService } from './reservation-availability.service.js';
import { ReservationsService } from './reservations.service.js';

const DEFAULT_DURATION_MINUTES = 90;

// Reservations are a front-of-house operational feature. Read/list/create/edit
// and the lifecycle actions are open to floor staff (CASHIER/WAITER) and up;
// hard delete is manager/admin only. SYSTEM_ADMIN never operates a tenant's
// reservations. Auth is role-based (matches the rest of the codebase).
@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly availabilityService: ReservationAvailabilityService,
  ) {}

  // --- Static/collection routes (must precede ':id') -------------------------

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ReservationQueryDto,
  ) {
    return this.reservationsService.findAll(tenantId, query);
  }

  @Get('today')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  findToday(
    @CurrentTenant() tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reservationsService.findToday(tenantId, branchId);
  }

  @Get('upcoming')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  findUpcoming(
    @CurrentTenant() tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reservationsService.findUpcoming(tenantId, branchId);
  }

  @Get('calendar')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  findCalendar(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
    @Query('branchId') branchId?: string,
  ) {
    const target = date ? new Date(date) : new Date();
    return this.reservationsService.findCalendar(tenantId, target, branchId);
  }

  @Get('availability')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  checkAvailability(
    @CurrentTenant() tenantId: string,
    @Query() query: CheckAvailabilityDto,
  ) {
    const [hours, minutes] = query.reservationTime.split(':').map(Number);
    const startAt = new Date(query.reservationDate);
    startAt.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    return this.availabilityService.checkAvailability(tenantId, {
      branchId: query.branchId,
      startAt,
      durationMinutes: query.durationMinutes ?? DEFAULT_DURATION_MINUTES,
      guestCount: query.guestCount,
      excludeReservationId: query.excludeReservationId,
    });
  }

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  @LogActivity(
    StaffActivityAction.RESERVATION_CREATED,
    StaffActivityModule.RESERVATIONS,
  )
  create(@Req() req: Request, @Body() dto: CreateReservationDto) {
    const user = req.user as { id: string; tenantId: string };
    return this.reservationsService.create(
      { tenantId: user.tenantId, userId: user.id },
      dto,
    );
  }

  // --- Single-resource routes ------------------------------------------------

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.reservationsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  @LogActivity(
    StaffActivityAction.RESERVATION_UPDATED,
    StaffActivityModule.RESERVATIONS,
  )
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @LogActivity(
    StaffActivityAction.RESERVATION_CANCELLED,
    StaffActivityModule.RESERVATIONS,
  )
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.reservationsService.remove(id, tenantId);
  }

  // --- Lifecycle actions -----------------------------------------------------

  @Post(':id/arrive')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  arrive(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.reservationsService.arrive(id, tenantId);
  }

  @Post(':id/seat')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  @LogActivity(
    StaffActivityAction.RESERVATION_SEATED,
    StaffActivityModule.RESERVATIONS,
  )
  seat(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SeatReservationDto,
  ) {
    const user = req.user as { id: string; tenantId: string };
    return this.reservationsService.seat(
      id,
      { tenantId: user.tenantId, userId: user.id },
      dto,
    );
  }

  @Post(':id/complete')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  @LogActivity(
    StaffActivityAction.RESERVATION_COMPLETED,
    StaffActivityModule.RESERVATIONS,
  )
  complete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.reservationsService.complete(id, tenantId);
  }

  @Post(':id/cancel')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER,
  )
  @LogActivity(
    StaffActivityAction.RESERVATION_CANCELLED,
    StaffActivityModule.RESERVATIONS,
  )
  cancel(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
  ) {
    return this.reservationsService.cancel(id, tenantId, dto.reason);
  }

  @Post(':id/no-show')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER)
  @LogActivity(
    StaffActivityAction.RESERVATION_NO_SHOW,
    StaffActivityModule.RESERVATIONS,
  )
  markNoShow(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.reservationsService.markNoShow(id, tenantId);
  }
}
