import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateToken } from '../utils/generateToken.js';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}
  async registerDevice(
    tenantId: string,
    data: Prisma.POSDeviceUncheckedCreateInput,
  ) {
    const token = generateToken();

    const device = await this.prisma.pOSDevice.create({
      data: {
        ...data,
        token,
        tenantId: tenantId,
      },
    });

    return device;
  }

  async updateActiveDevice(deviceId: string, isActive: boolean) {
    return await this.prisma.pOSDevice.update({
      where: { id: deviceId },
      data: { isActive },
    });
  }

  async updateKdsFlag(deviceId: string, isKDS: boolean) {
    return await this.prisma.pOSDevice.update({
      where: { id: deviceId },
      data: { isKDS },
    });
  }

  async validateDeviceToken(token: string) {
    return await this.prisma.pOSDevice.findUnique({
      where: { token },
    });
  }
}
