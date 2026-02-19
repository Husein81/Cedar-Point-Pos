import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateToken } from '../../utils/generateToken.js';

type CreateDeviceInput = {
  name: string;
  branchId: string;
  isKDS?: boolean;
};

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getDevices(tenantId: string, branchId?: string) {
    return this.prisma.pOSDevice.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(branchId && { branchId }),
      },
      select: {
        id: true,
        name: true,
        branchId: true,
        isActive: true,
        isKDS: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createDevice(tenantId: string, data: CreateDeviceInput) {
    const name = data.name?.trim();
    if (!name) {
      throw new BadRequestException('Device name is required');
    }

    if (!data.branchId) {
      throw new BadRequestException('Branch ID is required');
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: data.branchId,
        tenantId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found or not accessible');
    }

    const existing = await this.prisma.pOSDevice.findFirst({
      where: {
        tenantId,
        branchId: data.branchId,
        name,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('A device with this name already exists');
    }

    const token = generateToken();

    const device = await this.prisma.pOSDevice.create({
      data: {
        name,
        branchId: data.branchId,
        isKDS: data.isKDS ?? false,
        token,
        tenantId,
      },
    });

    return device;
  }

  // Backward-compatible alias for existing callers.
  async registerDevice(tenantId: string, data: CreateDeviceInput) {
    return this.createDevice(tenantId, data);
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
