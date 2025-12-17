import { Controller, Get, Post, Put, Req } from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { Request } from 'express';
import { DevicesService } from './devices.service.js';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  registerDevice(@Req() request: Request) {
    const { tenantId } = request.user as { tenantId: string };
    const body = request.body as Prisma.POSDeviceUncheckedCreateInput;
    return this.devicesService.registerDevice(tenantId, body);
  }

  @Put('update-active/:id')
  updateActiveDevice(@Req() request: Request) {
    const deviceId = request.params.id;

    if (!deviceId) {
      throw new Error('Device ID is required');
    }

    const { isActive } = request.body as { isActive: boolean };
    return this.devicesService.updateActiveDevice(deviceId, isActive);
  }

  @Put('update-kds-flag/:id')
  updateKdsFlag(@Req() request: Request) {
    const deviceId = request.params.id;
    if (!deviceId) {
      throw new Error('Device ID is required');
    }
    const { isKDS } = request.body as { isKDS: boolean };
    return this.devicesService.updateKdsFlag(deviceId, isKDS);
  }

  @Get('validate-token')
  validateDeviceToken(@Req() request: Request) {
    const token = request.headers['x-device-token'] as string;
    return this.devicesService.validateDeviceToken(token);
  }
}
