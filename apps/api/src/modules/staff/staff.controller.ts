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
  CreateStaffSchema,
  SetPinSchema,
  StaffActivityQuerySchema,
  StaffQuerySchema,
  UpdateStaffSchema,
  UserRole,
} from '@repo/types';
import { CurrentRole } from '../common/decorators/current-role.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { validateWith } from '../common/zod-validate.js';
import { StaffService } from './staff.service.js';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getStaff(@CurrentTenant() tenantId: string, @Query() query: unknown) {
    return this.staffService.getStaff(
      tenantId,
      validateWith(StaffQuerySchema, query),
    );
  }

  @Post()
  @Roles(UserRole.ADMIN)
  createStaff(@CurrentTenant() tenantId: string, @Body() body: unknown) {
    return this.staffService.createStaff(
      tenantId,
      validateWith(CreateStaffSchema, body),
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getStaffById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.staffService.getStaffById(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateStaff(
    @CurrentTenant() tenantId: string,
    @CurrentRole() actorRole: UserRole,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.staffService.updateStaff(
      tenantId,
      actorRole,
      id,
      validateWith(UpdateStaffSchema, body),
    );
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  toggleActive(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.staffService.toggleActive(tenantId, id);
  }

  @Patch(':id/toggle-pos')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
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
  setPin(
    @CurrentTenant() tenantId: string,
    @CurrentRole() actorRole: UserRole,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { pin } = validateWith(SetPinSchema, body);
    return this.staffService.setPin(tenantId, actorRole, id, pin);
  }

  @Get(':id/activity')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getActivity(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.staffService.getActivityLogs(
      tenantId,
      id,
      validateWith(StaffActivityQuerySchema, query),
    );
  }

  /** Force-close a POS session by its own id (the resource being acted on). */
  @Post('sessions/:sessionId/end')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  endSession(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.staffService.endSession(tenantId, sessionId);
  }
}
