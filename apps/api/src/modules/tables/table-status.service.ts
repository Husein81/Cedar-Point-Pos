import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TableStatus, OrderStatus } from '../../generated/prisma/client.js';

/**
 * Service responsible for managing table status transitions
 * Centralizes all table status logic to ensure consistency across the application
 */
@Injectable()
export class TableStatusService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Active order statuses that keep a table occupied
     */
    private readonly ACTIVE_ORDER_STATUSES: OrderStatus[] = [
        OrderStatus.DRAFT,
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.IN_PROGRESS,
        OrderStatus.SENT_TO_KITCHEN,
        OrderStatus.READY,
    ];

    /**
     * Updates table status with tenant validation and transaction support
     * @param tableId - ID of the table to update
     * @param status - New status for the table
     * @param tenantId - Tenant ID for security scoping
     * @param tx - Optional Prisma transaction client
     */
    async updateTableStatus(
        tableId: string,
        status: TableStatus,
        tenantId: string,
        tx?: any,
        expectedStatus?: TableStatus,
    ): Promise<void> {
        const prismaClient = tx || this.prisma;

        // Verify table exists and belongs to tenant before updating
        const table = await prismaClient.table.findFirst({
            where: {
                id: tableId,
                tenantId,
                isDeleted: false,
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
            throw new BadRequestException('Cannot change status of an inactive table');
        }

        // Detect race conditions using optimistic locking if expectedStatus is provided
        if (expectedStatus) {
            const result = await prismaClient.table.updateMany({
                where: {
                    id: tableId,
                    tenantId,
                    isDeleted: false,
                    status: expectedStatus, // Atomic check ensuring status hasn't changed
                },
                data: { status },
            });

            if (result.count === 0) {
                // Determine if failure was due to non-existence or status mismatch
                const exists = await prismaClient.table.findFirst({
                    where: { id: tableId, tenantId, isDeleted: false },
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
                    isDeleted: false,
                },
                data: { status },
            });
        }
    }

    /**
     * Determines if a table should be marked as AVAILABLE
     * Checks if there are any other active orders on the table
     * 
     * @param tableId - ID of the table to check
     * @param currentOrderId - ID of the current order to exclude from check
     * @param tenantId - Tenant ID for security scoping
     * @param tx - Optional Prisma transaction client
     * @returns true if table should be marked AVAILABLE, false otherwise
     */
    async shouldMarkTableAvailable(
        tableId: string,
        currentOrderId: string,
        tenantId: string,
        tx?: any,
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
        // Define valid transitions
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
        tx?: any,
        guestCount?: number,
    ): Promise<{ status: TableStatus; capacity: number | null }> {
        const prismaClient = tx || this.prisma;

        const table = await prismaClient.table.findFirst({
            where: {
                id: tableId,
                tenantId,
                isDeleted: false,
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

        if (guestCount && table.capacity < guestCount) {
            throw new BadRequestException(
                `Table capacity(${table.capacity}) is insufficient for ${guestCount} guests`,
            );
        }

        return {
            status: table.status,
            capacity: table.capacity,
        };
    }

    /**
     * Marks a table as OCCUPIED if it's not already occupied
     * Allows multiple orders on the same table
     * 
     * @param tableId - ID of the table
     * @param tenantId - Tenant ID for security scoping
     * @param tx - Prisma transaction client
     */
    async markTableOccupiedIfNeeded(
        tableId: string,
        tenantId: string,
        tx: any,
        guestCount?: number,
    ): Promise<void> {
        const table = await this.validateTableForOrder(tableId, tenantId, tx, guestCount);

        // Only update if transitioning from AVAILABLE or RESERVED
        if (table.status !== TableStatus.OCCUPIED) {
            await this.updateTableStatus(tableId, TableStatus.OCCUPIED, tenantId, tx);
        }
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
        tx: any,
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
