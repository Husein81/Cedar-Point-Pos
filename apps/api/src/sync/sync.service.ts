/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DevicesService } from '../devices/devices.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  Customer,
  InventoryHistory,
  Order,
  Payment,
  type PaymentMethod,
  Shift,
} from '@repo/types';
import type { SyncBatch, SyncResponse } from './dto/sync.dto.js';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * Process sync batch from device
   */
  async processSyncBatch(
    deviceToken: string,
    batch: SyncBatch,
  ): Promise<SyncResponse> {
    // 1. Validate device
    const device = await this.devicesService.validateDeviceToken(deviceToken);
    if (!device || !device.isActive) {
      throw new UnauthorizedException('Invalid or inactive device token');
    }

    const tenantId = device.tenantId;
    const deviceId = device.id;

    this.logger.log(
      `Processing sync batch from device ${deviceId} (tenant: ${tenantId})`,
    );

    const response: SyncResponse = {
      success: true,
      synced: {},
      conflicts: {},
      errors: [],
    };

    // Process each entity type in transaction
    return await this.prisma.$transaction(
      async (tx) => {
        // Process Orders (append-only, immutable after sync)
        if (batch.orders && batch.orders.length > 0) {
          const result = await this.syncOrders(
            tx,
            tenantId,
            deviceId,
            batch.orders,
          );
          response.synced.orders = result.synced;
          response.conflicts.orders = result.conflicts;
        }

        // Process Payments (immutable, never overwritten)
        if (batch.payments && batch.payments.length > 0) {
          const result = await this.syncPayments(
            tx,
            tenantId,
            deviceId,
            batch.payments,
          );
          response.synced.payments = result.synced;
          response.conflicts.payments = result.conflicts;
        }

        // Process Inventory History (delta-based, append-only)
        if (batch.inventoryHistory && batch.inventoryHistory.length > 0) {
          const result = await this.syncInventoryHistory(
            tx,
            tenantId,
            deviceId,
            batch.inventoryHistory,
          );
          response.synced.inventoryHistory = result.synced;
          response.conflicts.inventoryHistory = result.conflicts;
        }

        // Process Shifts (open/close constraints)
        if (batch.shifts && batch.shifts.length > 0) {
          const result = await this.syncShifts(
            tx,
            tenantId,
            deviceId,
            batch.shifts,
          );
          response.synced.shifts = result.synced;
          response.conflicts.shifts = result.conflicts;
        }

        // Process Customers (merge on conflict)
        if (batch.customers && batch.customers.length > 0) {
          const result = await this.syncCustomers(
            tx,
            tenantId,
            deviceId,
            batch.customers,
          );
          response.synced.customers = result.synced;
          response.conflicts.customers = result.conflicts;
        }

        // Update device lastSync timestamp
        await tx.pOSDevice.update({
          where: { id: deviceId },
          data: { lastSync: new Date() },
        });

        return response;
      },
      {
        timeout: 30000, // 30 second timeout
      },
    );
  }

  /**
   * Sync Orders - Append-only, immutable after sync
   * Rule: If order exists, reject (orders are immutable once synced)
   */
  private async syncOrders(
    tx: Prisma.TransactionClient,
    tenantId: string,
    deviceId: string,
    orders: Order[],
  ): Promise<{ synced: string[]; conflicts: string[]; errors: Error[] }> {
    const synced: string[] = [];
    const conflicts: string[] = [];
    const errors: Error[] = [];

    for (const orderData of orders) {
      try {
        // Check if order already exists
        const existing = await tx.order.findUnique({
          where: { id: orderData.id },
          select: { id: true, syncedAt: true },
        });

        if (existing && existing.syncedAt) {
          // Order already synced - immutable, reject
          conflicts.push(orderData.id);
          this.logger.warn(
            `Order ${orderData.id} already synced - rejecting duplicate`,
          );
          continue;
        }

        // Validate required fields
        if (!orderData.tenantId || orderData.tenantId !== tenantId) {
          throw new BadRequestException('Invalid tenant ID');
        }

        if (!orderData.branchId) {
          throw new BadRequestException('Branch ID required');
        }

        // Validate branch belongs to tenant
        const branch = await tx.branch.findFirst({
          where: { id: orderData.branchId, tenantId },
        });

        if (!branch) {
          throw new BadRequestException('Branch not found');
        }

        // Create order with sync metadata
        await tx.order.create({
          data: {
            id: orderData.id,
            tenantId,
            userId: orderData.userId,
            branchId: orderData.branchId,
            tableId: orderData.tableId,
            deviceId,
            customerId: orderData.customerId,
            shiftId: orderData.shiftId,
            orderNumber: orderData.orderNumber,
            type: orderData.type,
            status: orderData.status,
            subtotal: new Prisma.Decimal(orderData.subtotal || 0),
            taxAmount: new Prisma.Decimal(orderData.taxAmount || 0),
            total: new Prisma.Decimal(orderData.total || 0),
            discount: orderData.discount
              ? new Prisma.Decimal(orderData.discount)
              : null,
            createdAt: new Date(orderData.createdAt),
            completedAt: orderData.completedAt
              ? new Date(orderData.completedAt)
              : null,
            syncedAt: new Date(),
            syncVersion: 1,
            source: 'local',
            items: orderData.items
              ? {
                  create: orderData.items.map((item) => ({
                    id: item.id,
                    productId: item.productId,
                    quantity: new Prisma.Decimal(item.quantity),
                    unitPrice: new Prisma.Decimal(item.unitPrice),
                    subtotal: new Prisma.Decimal(Number(item.subtotal)),
                    taxRate: new Prisma.Decimal(item.taxRate || 0),
                    taxAmount: new Prisma.Decimal(item.taxAmount || 0),
                    total: new Prisma.Decimal(item.total),
                    notes: item.notes,

                    modifiers: item.modifiers
                      ? {
                          create: item.modifiers.map((mod) => ({
                            modifierId: String(mod.id),
                            price: new Prisma.Decimal(Number(mod.price)),
                          })),
                        }
                      : undefined,
                  })),
                }
              : undefined,
          },
        });

        synced.push(orderData.id);
      } catch (error) {
        this.logger.error(`Error syncing order ${orderData.id}:`, error);
      }
    }

    return { synced, conflicts, errors };
  }

  /**
   * Sync Payments - Immutable, never overwritten
   * Rule: If payment exists, reject (payments are immutable)
   */
  private async syncPayments(
    tx: Prisma.TransactionClient,
    tenantId: string,
    deviceId: string,
    payments: Payment[],
  ): Promise<{ synced: string[]; conflicts: string[]; errors: Error[] }> {
    const synced: string[] = [];
    const conflicts: string[] = [];
    const errors: Error[] = [];

    for (const paymentData of payments) {
      try {
        // Check if payment already exists
        const existing = await tx.payment.findUnique({
          where: { id: paymentData.id },
          select: { id: true },
        });

        if (existing) {
          // Payment already exists - immutable, reject
          conflicts.push(paymentData.id);
          this.logger.warn(
            `Payment ${paymentData.id} already exists - rejecting duplicate`,
          );
          continue;
        }

        // Validate order exists
        const order = await tx.order.findFirst({
          where: { id: paymentData.orderId, tenantId },
        });

        if (!order) {
          throw new BadRequestException('Order not found');
        }

        // Create payment
        await tx.payment.create({
          data: {
            id: paymentData.id,
            orderId: paymentData.orderId,
            method: paymentData.method as PaymentMethod,
            currencyCode: paymentData.currencyCode || 'USD',
            amount: new Prisma.Decimal(paymentData.amount),
            exchangeRate: paymentData.exchangeRate
              ? new Prisma.Decimal(paymentData.exchangeRate)
              : null,
            transactionId: paymentData.transactionId,
            paidAt: new Date(paymentData.paidAt),
            deviceId,
            syncedAt: new Date(),
            syncVersion: 1,
            source: 'local',
          },
        });

        synced.push(paymentData.id);
      } catch (error: any) {
        this.logger.error(`Error syncing payment ${paymentData.id}:`, error);
      }
    }

    return { synced, conflicts, errors };
  }

  /**
   * Sync Inventory History - Delta-based, append-only
   * Rule: Always append, never overwrite
   */
  private async syncInventoryHistory(
    tx: Prisma.TransactionClient,
    tenantId: string,
    deviceId: string,
    history: InventoryHistory[],
  ): Promise<{ synced: string[]; conflicts: string[]; errors: Error[] }> {
    const synced: string[] = [];
    const conflicts: string[] = [];
    const errors: Error[] = [];

    for (const historyData of history) {
      try {
        // Check if history record already exists
        const existing = await tx.inventoryHistory.findUnique({
          where: { id: historyData.id },
          select: { id: true },
        });

        if (existing) {
          // Already exists - skip (idempotent)
          synced.push(historyData.id);
          continue;
        }

        // Validate required fields
        if (
          !historyData.branchId ||
          !historyData.productId ||
          !historyData.userId
        ) {
          throw new BadRequestException('Missing required fields');
        }

        // Validate branch belongs to tenant
        const branch = await tx.branch.findFirst({
          where: { id: historyData.branchId, tenantId },
        });

        if (!branch) {
          throw new BadRequestException('Branch not found');
        }

        // Create inventory history record
        await tx.inventoryHistory.create({
          data: {
            id: historyData.id,
            tenantId,
            branchId: historyData.branchId,
            productId: historyData.productId,
            userId: historyData.userId,
            changeType: historyData.changeType,
            beforeStock: new Prisma.Decimal(historyData.beforeStock),
            afterStock: new Prisma.Decimal(historyData.afterStock),
            adjustment: new Prisma.Decimal(historyData.adjustment),
            beforeMinStock: historyData.beforeMinStock
              ? new Prisma.Decimal(historyData.beforeMinStock)
              : null,
            afterMinStock: historyData.afterMinStock
              ? new Prisma.Decimal(historyData.afterMinStock)
              : null,
            reason: historyData.reason,
            createdAt: new Date(historyData.createdAt),
            deviceId,
            syncedAt: new Date(),
            syncVersion: 1,
            source: 'local',
          },
        });

        // Apply inventory change (delta-based)
        await this.applyInventoryDelta(
          tx,
          tenantId,
          historyData.branchId,
          historyData.productId,
          Number(historyData.adjustment),
        );

        synced.push(historyData.id);
      } catch (error: any) {
        this.logger.error(
          `Error syncing inventory history ${historyData.id}:`,
          error,
        );
      }
    }

    return { synced, conflicts, errors };
  }

  /**
   * Apply inventory delta (increment/decrement stock)
   */
  private async applyInventoryDelta(
    tx: Prisma.TransactionClient,
    tenantId: string,
    branchId: string,
    productId: string,
    adjustment: number,
  ): Promise<void> {
    // Find or create inventory record
    const inventory = await tx.inventory.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
    });

    if (inventory) {
      // Update existing inventory
      const newStock = Number(inventory.stock) + adjustment;
      await tx.inventory.update({
        where: {
          branchId_productId: {
            branchId,
            productId,
          },
        },
        data: {
          stock: new Prisma.Decimal(Math.max(0, newStock)), // Prevent negative stock
          lastAdjusted: new Date(),
        },
      });
    } else {
      // Create new inventory record
      await tx.inventory.create({
        data: {
          tenantId,
          branchId,
          productId,
          stock: new Prisma.Decimal(Math.max(0, adjustment)),
          lastAdjusted: new Date(),
        },
      });
    }
  }

  /**
   * Sync Shifts - Open/close constraints
   * Rule: Only one open shift per branch at a time
   */
  private async syncShifts(
    tx: Prisma.TransactionClient,
    tenantId: string,
    deviceId: string,
    shifts: Shift[],
  ): Promise<{ synced: string[]; conflicts: string[]; errors: Error[] }> {
    const synced: string[] = [];
    const conflicts: string[] = [];
    const errors: Error[] = [];

    for (const shiftData of shifts) {
      try {
        // Check if shift already exists
        const existing = await tx.shift.findUnique({
          where: { id: shiftData.id },
          select: { id: true, status: true, branchId: true },
        });

        if (existing) {
          // If shift is OPEN and we're trying to sync another OPEN shift for same branch, conflict
          if (
            existing.status === 'OPEN' &&
            shiftData.status === 'OPEN' &&
            existing.branchId === shiftData.branchId
          ) {
            conflicts.push(shiftData.id);
            this.logger.warn(
              `Shift ${shiftData.id} conflicts with existing open shift`,
            );
            continue;
          }

          // Update existing shift (only if closing)
          if (shiftData.status === 'CLOSED' && existing.status === 'OPEN') {
            await tx.shift.update({
              where: { id: shiftData.id },
              data: {
                endTime: shiftData.endTime
                  ? new Date(shiftData.endTime)
                  : new Date(),
                endCash: shiftData.endCash
                  ? new Prisma.Decimal(shiftData.endCash)
                  : null,
                actualCash: shiftData.actualCash
                  ? new Prisma.Decimal(shiftData.actualCash)
                  : null,
                difference: shiftData.difference
                  ? new Prisma.Decimal(shiftData.difference)
                  : null,
                status: 'CLOSED',
                notes: shiftData.notes,
                syncedAt: new Date(),
                syncVersion: { increment: 1 },
                source: 'local',
              },
            });

            synced.push(shiftData.id);
            continue;
          }
        }

        // Validate branch
        const branch = await tx.branch.findFirst({
          where: { id: shiftData.branchId, tenantId },
        });

        if (!branch) {
          throw new BadRequestException('Branch not found');
        }

        // If opening a new shift, check for existing open shift
        if (shiftData.status === 'OPEN') {
          const openShift = await tx.shift.findFirst({
            where: {
              branchId: shiftData.branchId,
              status: 'OPEN',
              id: { not: shiftData.id },
            },
          });

          if (openShift) {
            conflicts.push(shiftData.id);
            this.logger.warn(
              `Cannot open shift ${shiftData.id} - branch already has open shift ${openShift.id}`,
            );
            continue;
          }
        }

        // Create new shift
        await tx.shift.create({
          data: {
            id: shiftData.id,
            tenantId,
            branchId: shiftData.branchId,
            userId: shiftData.userId,
            deviceId: shiftData.deviceId || deviceId,
            startTime: new Date(shiftData.startTime),
            endTime: shiftData.endTime ? new Date(shiftData.endTime) : null,
            startCash: new Prisma.Decimal(shiftData.startCash || 0),
            endCash: shiftData.endCash
              ? new Prisma.Decimal(shiftData.endCash)
              : null,
            actualCash: shiftData.actualCash
              ? new Prisma.Decimal(shiftData.actualCash)
              : null,
            difference: shiftData.difference
              ? new Prisma.Decimal(shiftData.difference)
              : null,
            status: shiftData.status,
            notes: shiftData.notes,
            syncedAt: new Date(),
            syncVersion: 1,
            source: 'local',
          },
        });

        synced.push(shiftData.id);
      } catch (error: any) {
        this.logger.error(`Error syncing shift ${shiftData.id}:`, error);
      }
    }

    return { synced, conflicts, errors };
  }

  /**
   * Sync Customers - Merge on conflict
   * Rule: If customer exists, update non-null fields
   */
  private async syncCustomers(
    tx: Prisma.TransactionClient,
    tenantId: string,
    deviceId: string,
    customers: Customer[],
  ): Promise<{ synced: string[]; conflicts: string[]; errors: Error[] }> {
    const synced: string[] = [];
    const conflicts: string[] = [];
    const errors: Error[] = [];

    for (const customerData of customers) {
      try {
        const existing = await tx.customer.findUnique({
          where: { id: customerData.id },
        });

        if (existing) {
          // Update existing customer (merge strategy)
          await tx.customer.update({
            where: { id: customerData.id },
            data: {
              name: customerData.name || existing.name,
              email: customerData.email || existing.email,
              phone: customerData.phone || existing.phone,
              address: customerData.address || existing.address,
              syncedAt: new Date(),
              syncVersion: { increment: 1 },
              source: 'local',
            },
          });

          synced.push(customerData.id);
        } else {
          // Create new customer
          await tx.customer.create({
            data: {
              id: customerData.id,
              tenantId,
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone,
              address: customerData.address,
              createdAt: new Date(customerData.createdAt),
              deviceId,
              syncedAt: new Date(),
              syncVersion: 1,
              source: 'local',
            },
          });

          synced.push(customerData.id);
        }
      } catch (error: any) {
        this.logger.error(`Error syncing customer ${customerData.id}:`, error);
      }
    }

    return { synced, conflicts, errors };
  }

  /**
   * Pull updates from server
   * Returns entities changed since lastSyncTime
   */
  async pullUpdates(
    tenantId: string,
    since: Date | null,
  ): Promise<{
    customers: Customer[];
    shifts: Shift[];
  }> {
    // 1. Fetch Customers changed since
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        updatedAt: since ? { gt: since } : undefined,
      },
    });

    // 2. Fetch Shifts changed since
    // We mainly care about CLOSED shifts or updates from other devices
    const shifts = await this.prisma.shift.findMany({
      where: {
        tenantId,
        endTime: since ? { gt: since } : undefined,
      },
    });

    // TODO: Add Inventory/Products pull here when Schema supports it in SyncBatch

    return {
      customers: customers.map((c) => ({
        ...c,
        syncedAt: c.syncedAt ?? c.updatedAt,
      })),
      shifts: shifts.map((s) => ({
        ...s,
        syncedAt: s.syncedAt ?? s.startTime,
        startCash: s.startCash.toString(),
        endCash: s.endCash?.toString() ?? null,
        actualCash: s.actualCash?.toString() ?? null,
        difference: s.difference?.toString() ?? null,
      })),
    };
  }
}
