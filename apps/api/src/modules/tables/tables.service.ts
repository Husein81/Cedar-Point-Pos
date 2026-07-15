import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { TableStatusService } from './table-status.service.js';
import { OrderStatus, TableStatus } from '../../generated/prisma/client.js';
import type {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableLayoutDto,
  UpdateTableStatusDto,
} from './dto/tables.dto.js';

/**
 * Order statuses that keep a table visually "in service" on the floor plan.
 * Includes PAID/PARTIALLY_PAID: for restaurants a paid table stays OCCUPIED
 * until the order is COMPLETED, so the floor plan must still show its bill.
 */
const OVERVIEW_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.SENT_TO_KITCHEN,
  OrderStatus.READY,
  OrderStatus.PAID,
  OrderStatus.PARTIALLY_PAID,
];

/**
 * Table.posX/posY/width/height/rotation are non-nullable, so every table
 * needs real geometry at creation time. New tables get a default footprint
 * auto-arranged into a grid (by creation order) so they don't all stack on
 * top of each other before a manager opens the Floor Editor.
 */
const DEFAULT_TABLE_SIZE = { width: 160, height: 120 };
const LAYOUT_GRID_GAP = 32;
const LAYOUT_GRID_COLUMNS = 5;

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tableStatusService: TableStatusService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private handleError(error: unknown, context: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
    console.error(`Error in ${context}:`, error);
    throw new InternalServerErrorException(
      `Failed to ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  /**
   * Post-commit notification that the branch's floor plan changed.
   * The KitchenGateway forwards it to the branch's socket room.
   */
  private emitTablesChanged(branchId: string): void {
    this.eventEmitter.emit('table.updated', { branchId });
  }

  async getTablesByBranch(branchId: string, tenantId: string) {
    return this.prisma.table.findMany({
      where: {
        branchId,
        tenantId,
        deletedAt: null,
      },
      include: {
        floor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ floor: { order: 'asc' } }, { tableNumber: 'asc' }],
    });
  }

  async getTablesByFloor(floorId: string, tenantId: string) {
    const tables = await this.prisma.table.findMany({
      where: {
        floorId,
        tenantId,
        deletedAt: null,
      },
      orderBy: { tableNumber: 'asc' },
    });

    if (tables.length === 0) {
      const floorExists = await this.prisma.floor.findFirst({
        where: {
          id: floorId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!floorExists) {
        throw new NotFoundException('Floor not found');
      }
    }

    return tables;
  }

  async getTableById(id: string, tenantId: string) {
    const table = await this.prisma.table.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        floor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async createTable(data: CreateTableDto, tenantId: string) {
    try {
      const table = await this.prisma.$transaction(async (tx) => {
        const branch = await tx.branch.findFirst({
          where: {
            id: data.branchId,
            tenantId,
            isDeleted: false,
          },
        });

        if (!branch) {
          throw new BadRequestException('Branch not found or access denied');
        }

        if (data.floorId) {
          const floor = await tx.floor.findFirst({
            where: {
              id: data.floorId,
              branchId: data.branchId,
              tenantId,
              deletedAt: null,
            },
          });

          if (!floor) {
            throw new BadRequestException(
              'Floor not found or does not belong to this branch',
            );
          }
        }

        const existingTable = await tx.table.findFirst({
          where: {
            branchId: data.branchId,
            tableNumber: data.tableNumber,
            deletedAt: null,
          },
        });

        if (existingTable) {
          throw new BadRequestException(
            `Table number ${data.tableNumber} already exists in this branch`,
          );
        }

        const existingCount = await tx.table.count({
          where: { branchId: data.branchId, deletedAt: null },
        });
        const column = existingCount % LAYOUT_GRID_COLUMNS;
        const row = Math.floor(existingCount / LAYOUT_GRID_COLUMNS);

        return tx.table.create({
          data: {
            tableNumber: data.tableNumber,
            name: data.name,
            capacity: data.capacity,
            shape: data.shape,
            posX:
              LAYOUT_GRID_GAP +
              column * (DEFAULT_TABLE_SIZE.width + LAYOUT_GRID_GAP),
            posY:
              LAYOUT_GRID_GAP +
              row * (DEFAULT_TABLE_SIZE.height + LAYOUT_GRID_GAP),
            width: DEFAULT_TABLE_SIZE.width,
            height: DEFAULT_TABLE_SIZE.height,
            rotation: 0,
            tenantId,
            branchId: data.branchId,
            floorId: data.floorId,
          },
          include: {
            floor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });

      this.emitTablesChanged(table.branchId);
      return table;
    } catch (error) {
      this.handleError(error, 'create table');
    }
  }

  async updateTable(id: string, data: UpdateTableDto, tenantId: string) {
    try {
      const table = await this.prisma.$transaction(async (tx) => {
        const existingTable = await tx.table.findFirst({
          where: {
            id,
            tenantId,
            deletedAt: null,
          },
        });

        if (!existingTable) {
          throw new NotFoundException('Table not found');
        }

        if (data.floorId !== undefined && data.floorId !== null) {
          const floor = await tx.floor.findFirst({
            where: {
              id: data.floorId,
              branchId: existingTable.branchId,
              tenantId,
              deletedAt: null,
            },
          });

          if (!floor) {
            throw new BadRequestException(
              'Floor not found or does not belong to this branch',
            );
          }
        }

        if (
          data.tableNumber &&
          data.tableNumber !== existingTable.tableNumber
        ) {
          const duplicateTable = await tx.table.findFirst({
            where: {
              branchId: existingTable.branchId,
              tableNumber: data.tableNumber,
              deletedAt: null,
              NOT: { id },
            },
          });

          if (duplicateTable) {
            throw new BadRequestException(
              `Table number ${data.tableNumber} already exists in this branch`,
            );
          }
        }

        return tx.table.update({
          where: { id },
          data: {
            tableNumber: data.tableNumber,
            name: data.name,
            capacity: data.capacity,
            floorId: data.floorId,
            isActive: data.isActive,
            shape: data.shape,
          },
          include: {
            floor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });

      this.emitTablesChanged(table.branchId);
      return table;
    } catch (error) {
      this.handleError(error, 'update table');
    }
  }

  /**
   * Update table status (AVAILABLE, OCCUPIED, RESERVED)
   * Blocks manual release to AVAILABLE if active orders exist,
   * and rejects transitions outside the status machine.
   */
  async updateTableStatus(
    id: string,
    data: UpdateTableStatusDto,
    tenantId: string,
  ) {
    try {
      const table = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.table.findFirst({
          where: { id, tenantId, deletedAt: null },
          select: { status: true, branchId: true },
        });

        if (!existing) {
          throw new NotFoundException('Table not found');
        }

        const nextStatus = data.status as TableStatus;

        if (
          !this.tableStatusService.canTransitionTo(existing.status, nextStatus)
        ) {
          throw new BadRequestException({
            message: `Cannot change table status from ${existing.status} to ${nextStatus}`,
            code: 'INVALID_TABLE_TRANSITION',
          });
        }

        if (nextStatus === 'AVAILABLE') {
          const hasActive = await this.tableStatusService.hasActiveOrders(
            id,
            tenantId,
            tx,
          );
          if (hasActive) {
            throw new BadRequestException(
              'Cannot release table with active orders. Complete or cancel all orders first.',
            );
          }
        }

        await this.tableStatusService.updateTableStatus(
          id,
          nextStatus,
          tenantId,
          tx,
        );

        return this.getTableById(id, tenantId);
      });

      this.emitTablesChanged(table.branchId);
      return table;
    } catch (error) {
      this.handleError(error, 'update table status');
    }
  }

  /**
   * Returns all active orders for a given table.
   */
  async getActiveOrdersByTable(tableId: string, tenantId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return this.tableStatusService.getActiveOrdersForTable(tableId, tenantId);
  }

  async deleteTable(id: string, tenantId: string) {
    try {
      const table = await this.prisma.$transaction(async (tx) => {
        const existingTable = await tx.table.findFirst({
          where: {
            id,
            tenantId,
            deletedAt: null,
          },
        });

        if (!existingTable) {
          throw new NotFoundException('Table not found');
        }

        const activeOrdersCount = await tx.order.count({
          where: {
            tableId: id,
            status: {
              in: ['DRAFT', 'PENDING', 'CONFIRMED'],
            },
          },
        });

        if (activeOrdersCount > 0) {
          throw new BadRequestException(
            'Cannot delete table with active orders. Please complete or cancel all orders first.',
          );
        }

        return tx.table.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      });

      this.emitTablesChanged(table.branchId);
      return table;
    } catch (error) {
      this.handleError(error, 'delete table');
    }
  }

  async getTableStats(branchId: string, tenantId: string) {
    const tables = await this.prisma.table.findMany({
      where: {
        branchId,
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        status: true,
      },
    });

    const stats = {
      total: tables.length,
      available: tables.filter((t) => t.status === 'AVAILABLE').length,
      occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
      reserved: tables.filter((t) => t.status === 'RESERVED').length,
    };

    return stats;
  }

  /**
   * Floor-plan overview: every table in the branch plus a lightweight summary
   * of its most recent in-service order — one round-trip, no per-table N+1.
   * Powers the POS floor canvas (elapsed time, bill, guests, server, status).
   */
  async getTablesOverview(branchId: string, tenantId: string) {
    const tables = await this.prisma.table.findMany({
      where: {
        branchId,
        tenantId,
        deletedAt: null,
      },
      include: {
        floor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ floor: { order: 'asc' } }, { tableNumber: 'asc' }],
    });

    if (tables.length === 0) {
      return [];
    }

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        tableId: { in: tables.map((t) => t.id) },
        status: { in: OVERVIEW_ORDER_STATUSES },
      },
      select: {
        id: true,
        tableId: true,
        orderNumber: true,
        status: true,
        total: true,
        guestCount: true,
        createdAt: true,
        user: { select: { name: true } },
        customer: { select: { name: true } },
        payments: { select: { amount: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Most recent in-service order per table (list is createdAt desc).
    const orderByTableId = new Map<string, (typeof orders)[number]>();
    for (const order of orders) {
      if (order.tableId && !orderByTableId.has(order.tableId)) {
        orderByTableId.set(order.tableId, order);
      }
    }

    return tables.map((table) => {
      const order = orderByTableId.get(table.id);
      const shouldShowOrder = order && table.status !== 'AVAILABLE';

      return {
        ...table,
        activeOrder: shouldShowOrder
          ? {
              orderId: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              total: order.total,
              paidAmount: order.payments.reduce(
                (sum, p) => sum + Number(p.amount),
                0,
              ),
              itemCount: order._count.items,
              guestCount: order.guestCount,
              createdAt: order.createdAt,
              userName: order.user?.name ?? null,
              customerName: order.customer?.name ?? null,
            }
          : null,
      };
    });
  }

  /**
   * Bulk save of floor-plan geometry from the Floor Editor.
   * All ids must be live tables of this tenant or the whole save is rejected.
   */
  async updateTableLayout(data: UpdateTableLayoutDto, tenantId: string) {
    try {
      const branchId = await this.prisma.$transaction(async (tx) => {
        const ids = data.updates.map((u) => u.id);

        const tables = await tx.table.findMany({
          where: { id: { in: ids }, tenantId, deletedAt: null },
          select: { id: true, branchId: true },
        });

        if (tables.length !== ids.length) {
          throw new BadRequestException(
            'One or more tables were not found. Refresh the floor plan and try again.',
          );
        }

        for (const update of data.updates) {
          await tx.table.update({
            where: { id: update.id },
            data: {
              posX: Math.round(update.posX),
              posY: Math.round(update.posY),
              ...(update.width !== undefined && {
                width: Math.round(update.width),
              }),
              ...(update.height !== undefined && {
                height: Math.round(update.height),
              }),
              ...(update.rotation !== undefined && {
                rotation: Math.round(update.rotation),
              }),
              shape: update.shape,
            },
          });
        }

        // All updates verified to belong to the tenant; use the first table's
        // branch for the change broadcast (editor saves are per-branch).
        // noUncheckedIndexedAccess: tables is non-empty (ArrayMinSize(1) + count check).
        return tables[0]?.branchId ?? null;
      });

      if (branchId) {
        this.emitTablesChanged(branchId);
      }
      return { updated: data.updates.length };
    } catch (error) {
      this.handleError(error, 'update table layout');
    }
  }
}
