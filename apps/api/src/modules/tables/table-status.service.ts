import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ACTIVE_ORDER_STATUSES } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { fetchAdditionalOrderCustomers } from '../common/order-customers.util.js';
import {
  TableStatus,
  OrderStatus,
  Prisma,
} from '../../generated/prisma/client.js';

@Injectable()
export class TableStatusService {
  constructor(private readonly prisma: PrismaService) {}

  // Canonical list from @repo/types — a SERVED (even fully paid) order keeps
  // its table in service until the order is COMPLETED or CANCELLED.
  private readonly ACTIVE_ORDER_STATUSES: OrderStatus[] = [
    ...ACTIVE_ORDER_STATUSES,
  ];

  async updateTableStatus(
    tableId: string,
    status: TableStatus,
    tenantId: string,
    tx?: Prisma.TransactionClient,
    expectedStatus?: TableStatus,
  ): Promise<void> {
    const prismaClient = tx || this.prisma;

    // Verify table exists and belongs to tenant before updating
    const table = await prismaClient.table.findFirst({
      where: {
        id: tableId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        isActive: true,
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (!table.isActive) {
      throw new BadRequestException(
        'Cannot change status of an inactive table',
      );
    }

    // Detect race conditions using optimistic locking if expectedStatus is provided
    if (expectedStatus) {
      const result = await prismaClient.table.updateMany({
        where: {
          id: tableId,
          tenantId,
          deletedAt: null,
          status: expectedStatus, // Atomic check ensuring status hasn't changed
        },
        data: { status },
      });

      if (result.count === 0) {
        // Determine if failure was due to non-existence or status mismatch
        const exists = await prismaClient.table.findFirst({
          where: { id: tableId, tenantId, deletedAt: null },
        });

        if (!exists) {
          throw new NotFoundException('Table not found');
        }

        throw new ConflictException(
          `Table status has changed.Expected ${expectedStatus} but found ${exists.status}. Please refresh and try again.`,
        );
      }
    } else {
      // Standard update without concurrency check
      await prismaClient.table.updateMany({
        where: {
          id: tableId,
          tenantId,
          deletedAt: null,
        },
        data: { status },
      });
    }
  }

  async shouldMarkTableAvailable(
    tableId: string,
    currentOrderId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const prismaClient = tx || this.prisma;

    const otherActiveOrders = await prismaClient.order.count({
      where: {
        tableId,
        tenantId,
        id: { not: currentOrderId },
        status: {
          in: this.ACTIVE_ORDER_STATUSES,
        },
      },
    });

    return otherActiveOrders === 0;
  }

  /**
   * Validates if a table can transition to a given status
   * Used for manual status changes to prevent invalid transitions
   *
   * @param currentStatus - Current table status
   * @param newStatus - Desired new status
   * @returns true if transition is valid
   */
  canTransitionTo(currentStatus: TableStatus, newStatus: TableStatus): boolean {
    // Define valid transitions.
    const validTransitions: Record<TableStatus, TableStatus[]> = {
      [TableStatus.AVAILABLE]: [TableStatus.OCCUPIED, TableStatus.RESERVED],
      [TableStatus.OCCUPIED]: [TableStatus.AVAILABLE, TableStatus.RESERVED],
      [TableStatus.RESERVED]: [TableStatus.AVAILABLE, TableStatus.OCCUPIED],
    };

    // Allow same status (no-op)
    if (currentStatus === newStatus) {
      return true;
    }

    const allowedTransitions = validTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Validates table availability before associating with an order
   *
   * @param tableId - ID of the table to validate
   * @param tenantId - Tenant ID for security scoping
   * @param tx - Optional Prisma transaction client
   * @throws BadRequestException if table is invalid or unavailable
   */
  async validateTableForOrder(
    tableId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ status: TableStatus; capacity: number | null }> {
    const prismaClient = tx || this.prisma;

    const table = await prismaClient.table.findFirst({
      where: {
        id: tableId,
        tenantId,
        deletedAt: null,
      },
      select: {
        status: true,
        isActive: true,
        capacity: true,
      },
    });

    if (!table) {
      throw new BadRequestException('Table not found');
    }

    if (!table.isActive) {
      throw new BadRequestException('Table is not active');
    }

    // Seating over a table's capacity is allowed — the POS surfaces it as a
    // soft "over capacity" warning on the table card rather than blocking it.

    return {
      status: table.status,
      capacity: table.capacity,
    };
  }

  /**
   * Marks a table as OCCUPIED if it's not already occupied.
   * Validates table capacity against guestCount if provided.
   *
   * @param tableId - ID of the table
   * @param tenantId - Tenant ID for security scoping
   * @param tx - Prisma transaction client
   * @param guestCount - Optional number of guests; if provided, validates table capacity
   * @throws BadRequestException if guestCount exceeds table capacity
   */
  async markTableOccupiedIfNeeded(
    tableId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
    guestCount?: number,
  ): Promise<void> {
    const table = await this.validateTableForOrder(tableId, tenantId, tx);

    // Validate capacity if guestCount provided and table has a capacity limit
    if (guestCount !== undefined && table.capacity !== null && guestCount > table.capacity) {
      throw new BadRequestException(
        `Table capacity is ${table.capacity} guests but ${guestCount} were requested`,
      );
    }

    // Only update if transitioning from AVAILABLE or RESERVED
    if (table.status !== TableStatus.OCCUPIED) {
      await this.updateTableStatus(tableId, TableStatus.OCCUPIED, tenantId, tx);
    }
  }

  /**
   * Check if a table has any active (non-terminal) orders.
   * Used by manual release guard to prevent releasing occupied tables.
   */
  async hasActiveOrders(
    tableId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const prismaClient = tx || this.prisma;

    const count = await prismaClient.order.count({
      where: {
        tableId,
        tenantId,
        status: { in: this.ACTIVE_ORDER_STATUSES },
      },
    });

    return count > 0;
  }

  /**
   * Get all active orders for a table (non-terminal statuses).
   * Returns summary data for UI display.
   */
  async getActiveOrdersForTable(
    tableId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx || this.prisma;

    const orders = await prismaClient.order.findMany({
      where: {
        tableId,
        tenantId,
        status: { in: this.ACTIVE_ORDER_STATUSES },
      },
      include: {
        items: {
          include: {
            product: true,
            modifiers: {
              include: { modifier: true },
            },
            refundItems: true,
          },
        },
        customer: { select: { id: true, name: true } },
        payments: {
          select: { id: true, method: true, amount: true, paidAt: true },
        },
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Additional (shared) customers fetched separately + guarded so a missing
    // join table can't break loading a table's orders.
    const additionalByOrder = await fetchAdditionalOrderCustomers(
      this.prisma,
      orders.map((o) => o.id),
    );
    return orders.map((order) => ({
      ...order,
      orderCustomers: additionalByOrder.get(order.id) ?? [],
    }));
  }

  /**
   * Marks a table as AVAILABLE if no other active orders exist
   *
   * @param tableId - ID of the table
   * @param currentOrderId - ID of the order being completed/cancelled
   * @param tenantId - Tenant ID for security scoping
   * @param tx - Prisma transaction client
   */
  async markTableAvailableIfPossible(
    tableId: string,
    currentOrderId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const shouldMarkAvailable = await this.shouldMarkTableAvailable(
      tableId,
      currentOrderId,
      tenantId,
      tx,
    );

    if (shouldMarkAvailable) {
      await this.updateTableStatus(
        tableId,
        TableStatus.AVAILABLE,
        tenantId,
        tx,
      );
    }
  }
}
