import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShiftStatus, TransferStatus } from '../../generated/prisma/client.js';

@Injectable()
export class SystemAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    return {
      tenants: await this.prisma.tenant.count(),
      users: await this.prisma.user.count(),
      branches: await this.prisma.branch.count(),
      ordersToday: await this.prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    };
  }

  async getFinanceSnapshot() {
    return {
      totalRevenueToday: await this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    };
  }

  async getOperationalHealth() {
    return {
      openShifts: await this.prisma.shift.count({
        where: { status: ShiftStatus.OPEN },
      }),
      inactiveDevices: await this.prisma.pOSDevice.count({
        where: { isActive: false },
      }),
      pendingTransfers: await this.prisma.transfer.count({
        where: { status: TransferStatus.PENDING },
      }),
    };
  }

  async getAlerts() {
    return {
      lowStockItems: await this.prisma.inventory.count({
        where: {
          stock: { lt: 1 },
        },
      }),
      staleDevices: await this.prisma.pOSDevice.count({
        where: {
          lastSync: {
            lt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours
          },
        },
      }),
    };
  }
}
