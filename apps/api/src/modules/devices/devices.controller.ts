import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';

import type { Request } from 'express';
import { DevicesService } from './devices.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  registerDevice(
    @Req() request: Request,
    @Body() body: Prisma.POSDeviceUncheckedCreateInput,
  ) {
    const { tenantId } = request.user as { tenantId: string };
    return this.devicesService.registerDevice(tenantId, body);
  }

  @Put('update-active/:id')
  updateActiveDevice(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.devicesService.updateActiveDevice(id, body.isActive);
  }

  @Put('update-kds-flag/:id')
  updateKdsFlag(@Param('id') id: string, @Body() body: { isKDS: boolean }) {
    return this.devicesService.updateKdsFlag(id, body.isKDS);
  }

  @Get('validate-token')
  validateDeviceToken(@Req() request: Request) {
    const token = request.headers['x-device-token'] as string;
    return this.devicesService.validateDeviceToken(token);
  }
}
