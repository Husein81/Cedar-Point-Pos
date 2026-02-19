import { Body, Controller, Get, Post, Put, Query, Req } from '@nestjs/common';

import type { Request } from 'express';
import { DevicesService } from './devices.service.js';

type CreateDeviceBody = {
  name: string;
  branchId: string;
  isKDS?: boolean;
};

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  getDevices(
    @Req() request: Request,
    @Query('branchId') branchId?: string,
  ) {
    const { tenantId } = request.user as { tenantId: string };
    return this.devicesService.getDevices(tenantId, branchId);
  }

  @Post()
  createDevice(@Req() request: Request, @Body() body: CreateDeviceBody) {
    const { tenantId } = request.user as { tenantId: string };
    return this.devicesService.createDevice(tenantId, body);
  }

  @Post('register')
  registerDevice(@Req() request: Request, @Body() body: CreateDeviceBody) {
    const { tenantId } = request.user as { tenantId: string };
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
