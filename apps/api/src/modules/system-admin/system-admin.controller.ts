import { Controller, Get } from '@nestjs/common';
import { SystemAdminService } from './system-admin.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/client.js';

@Controller('system-admin')
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  // DASHBOARD ENDPOINTS
  @Roles(UserRole.SYSTEM_ADMIN)
  @Get('dashboard/overview')
  getOverview() {
    return this.systemAdminService.getOverview();
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Get('dashboard/finance')
  getFinanceSnapshot() {
    return this.systemAdminService.getFinanceSnapshot();
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Get('dashboard/operations')
  getOperationalHealth() {
    return this.systemAdminService.getOperationalHealth();
  }

  @Roles(UserRole.SYSTEM_ADMIN)
  @Get('dashboard/alerts')
  getAlerts() {
    return this.systemAdminService.getAlerts();
  }
}
