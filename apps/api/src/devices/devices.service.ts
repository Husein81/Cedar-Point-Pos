import { generateToken } from '../utils/generateToken.js';
import { Injectable } from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';

@Injectable()
export class DevicesService {
  async registerDevice(
    tenantId: string,
    data: Prisma.POSDeviceUncheckedCreateInput,
  ) {
    const token = generateToken();

    const device = await prisma.pOSDevice.create({
      data: {
        ...data,
        token,
        tenantId: tenantId,
      },
    });

    return device;
  }

  async updateActiveDevice(deviceId: string, isActive: boolean) {
    return await prisma.pOSDevice.update({
      where: { id: deviceId },
      data: { isActive },
    });
  }

  async updateKdsFlag(deviceId: string, isKDS: boolean) {
    return await prisma.pOSDevice.update({
      where: { id: deviceId },
      data: { isKDS },
    });
  }

  async validateDeviceToken(token: string) {
    return await prisma.pOSDevice.findUnique({
      where: { token },
    });
  }
}
