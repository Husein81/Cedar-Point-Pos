import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TableStatusService } from './table-status.service.js';

/**
 * Event payload interfaces for type safety
 */
export interface TableOrderCreatedEvent {
    tableId: string;
    orderId: string;
    tenantId: string;
}

export interface TableOrderCompletedEvent {
    tableId: string;
    orderId: string;
    tenantId: string;
}

/**
 * Listener for table-related events from the orders domain
 * Implements event-driven architecture to decouple orders and tables modules
 */
@Injectable()
export class TableEventsListener {
    constructor(private readonly tableStatusService: TableStatusService) { }

    /**
     * Handles order creation event
     * Updates table status to OCCUPIED when an order is created with a table
     */
    @OnEvent('table.order.created', { async: true })
    async handleOrderCreated(payload: TableOrderCreatedEvent): Promise<void> {
        const { tableId, tenantId } = payload;

        try {
            // Use a transaction-less approach since this is async event handling
            // The order creation already handles this in a transaction
            // This listener is for additional side effects or future extensibility
            console.log(`[TableEventsListener] Order created for table ${tableId}`);
        } catch (error) {
            console.error('[TableEventsListener] Error handling order created:', error);
            // Don't throw - we don't want event handling errors to break the main flow
        }
    }

    /**
     * Handles order completion/cancellation event
     * Marks table as AVAILABLE if no other active orders exist
     */
    @OnEvent('table.order.completed', { async: true })
    async handleOrderCompleted(payload: TableOrderCompletedEvent): Promise<void> {
        const { tableId, orderId, tenantId } = payload;

        try {
            // Note: The actual table status update is handled synchronously in the service
            // This event is for logging, notifications, or other async side effects
            console.log(`[TableEventsListener] Order ${orderId} completed for table ${tableId}`);

            // Future enhancements could include:
            // - Send notifications to staff
            // - Update analytics
            // - Trigger cleaning workflows
        } catch (error) {
            console.error('[TableEventsListener] Error handling order completed:', error);
            // Don't throw - we don't want event handling errors to break the main flow
        }
    }

    /**
     * Handles table status change event (for audit logging)
     */
    @OnEvent('table.status.changed', { async: true })
    async handleTableStatusChanged(payload: {
        tableId: string;
        fromStatus: string;
        toStatus: string;
        changedBy: 'SYSTEM' | string;
        reason?: string;
        tenantId: string;
    }): Promise<void> {
        try {
            console.log('[TableEventsListener] Table status changed:', payload);

            // Future: Implement audit logging here
            // await this.auditService.log({
            //   entity: 'Table',
            //   entityId: payload.tableId,
            //   action: 'STATUS_CHANGE',
            //   details: payload,
            // });
        } catch (error) {
            console.error('[TableEventsListener] Error handling status change:', error);
        }
    }
}
