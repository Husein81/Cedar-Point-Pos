import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  StaffActivityAction,
  StaffActivityModule,
  UserRole,
} from '@repo/types';
import { CurrentRole } from '../common/decorators/current-role.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { LogActivity } from './decorators/log-activity.decorator.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import {
  ResetPasswordDto,
  SetPinDto,
} from './dto/staff-pin-password.dto.js';
import {
  StaffActivityQueryDto,
  StaffQueryDto,
} from './dto/staff-query.dto.js';
import { StaffService } from './staff.service.js';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getStaff(@CurrentTenant() tenantId: string, @Query() query: StaffQueryDto) {
    return this.staffService.getStaff(tenantId, query);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @LogActivity(StaffActivityAction.STAFF_CREATED, StaffActivityModule.STAFF)
  createStaff(@CurrentTenant() tenantId: string, @Body() body: CreateStaffDto) {
    return this.staffService.createStaff(tenantId, body);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getStaffById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.staffService.getStaffById(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @LogActivity(StaffActivityAction.STAFF_UPDATED, StaffActivityModule.STAFF)
  updateStaff(
    @CurrentTenant() tenantId: string,
    @CurrentRole() actorRole: UserRole,
    @Param('id') id: string,
    @Body() body: UpdateStaffDto,
  ) {
    return this.staffService.updateStaff(tenantId, actorRole, id, body);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  @LogActivity(
    StaffActivityAction.STAFF_ACTIVE_TOGGLED,
    StaffActivityModule.STAFF,
  )
  toggleActive(
    @CurrentTenant() tenantId: string,
    @CurrentRole() actorRole: UserRole,
    @Param('id') id: string,
  ) {
    return this.staffService.toggleActive(tenantId, actorRole, id);
  }

  @Patch(':id/toggle-pos')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @LogActivity(StaffActivityAction.STAFF_POS_TOGGLED, StaffActivityModule.STAFF)
  togglePosAccess(
    @CurrentTenant() tenantId: string,
    @CurrentRole() actorRole: UserRole,
    @Param('id') id: string,
  ) {
    return this.staffService.togglePosAccess(tenantId, actorRole, id);
  }

  /**
   * Set or reset a staff member's POS PIN. Scoped to the caller's tenant and
   * gated by the role hierarchy so a manager cannot set a PIN on an admin
   * account (which would let them PIN-login with admin privileges).
   */
  @Patch(':id/set-pin')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @LogActivity(StaffActivityAction.STAFF_PIN_SET, StaffActivityModule.STAFF)
  setPin(
    @CurrentTenant() tenantId: string,
    @CurrentRole() actorRole: UserRole,
    @Param('id') id: string,
    @Body() body: SetPinDto,
  ) {
    return this.staffService.setPin(tenantId, actorRole, id, body.pin);
  }

  /**
   * Reset a staff member's login password. Scoped to the caller's tenant and
   * gated by the role hierarchy so a manager cannot reset an admin's password
   * (which would let them take over the account). The existing refresh token is
   * revoked server-side so prior password-login sessions can no longer refresh.
   */
  @Patch(':id/reset-password')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @LogActivity(
    StaffActivityAction.STAFF_PASSWORD_RESET,
    StaffActivityModule.STAFF,
  )
  resetPassword(
    @CurrentTenant() tenantId: string,
    @CurrentRole() actorRole: UserRole,
    @Param('id') id: string,
    @Body() body: ResetPasswordDto,
  ) {
    return this.staffService.resetPassword(
      tenantId,
      actorRole,
      id,
      body.password,
    );
  }

  @Get(':id/activity')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getActivity(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: StaffActivityQueryDto,
  ) {
    return this.staffService.getActivityLogs(tenantId, id, query);
  }

  /**
   * Force-close a POS session by its own id (the resource being acted on).
   * Idempotent state change, so `PATCH` — consistent with the toggle endpoints.
   */
  @Patch('sessions/:sessionId/end')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @LogActivity(
    StaffActivityAction.STAFF_SESSION_ENDED,
    StaffActivityModule.STAFF,
  )
  endSession(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.staffService.endSession(tenantId, sessionId);
  }
}
