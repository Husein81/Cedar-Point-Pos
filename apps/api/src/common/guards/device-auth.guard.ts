import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { POSDevice } from '@repo/types';
import { Request } from 'express';
import { DevicesService } from '../../devices/devices.service.js';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly devicesService: DevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request & { device: POSDevice } = context
      .switchToHttp()
      .getRequest();
    const deviceToken = request.headers['x-device-token'] as string;

    if (!deviceToken) {
      throw new UnauthorizedException('Device token required');
    }

    const device = await this.devicesService.validateDeviceToken(deviceToken);

    if (!device) {
      throw new UnauthorizedException('Invalid device token');
    }

    if (!device.isActive) {
      throw new UnauthorizedException('Device is not active');
    }

    // Attach device info to request for use in controllers
    request.device = device;

    return true;
  }
}
