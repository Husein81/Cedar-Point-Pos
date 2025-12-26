import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReportQueryDto } from './dto/report-query.dto.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Sales Report - Total revenue, order count, average order value
     */
    async getSalesReport(tenantId: string, query: ReportQueryDto) {
        const { from, to, branchId } = query;

        const where: Prisma.OrderWhereInput = {
            tenantId,
            status: 'COMPLETED',
            createdAt: {
                gte: from,
                lte: to,
            },
            ...(branchId && { branchId }),
        };

        const aggregation = await this.prisma.order.aggregate({
            where,
            _sum: {
                total: true,
                taxAmount: true,
                subtotal: true,
                discount: true,
            },
            _count: true,
        });

        const totalRevenue = Number(aggregation._sum.total) || 0;
        const orderCount = aggregation._count || 0;
        const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

        return {
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalTax: Number(aggregation._sum.taxAmount) || 0,
            totalSubtotal: Number(aggregation._sum.subtotal) || 0,
            totalDiscount: Number(aggregation._sum.discount) || 0,
            orderCount,
            averageOrderValue: Number(averageOrderValue.toFixed(2)),
            dateRange: { from, to },
            branchId: branchId || null,
        };
    }

    /**
     * Payments Report - Revenue grouped by payment method
     */
    async getPaymentsReport(tenantId: string, query: ReportQueryDto) {
        const { from, to, branchId } = query;

        const payments = await this.prisma.payment.groupBy({
            by: ['method'],
            where: {
                order: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: {
                        gte: from,
                        lte: to,
                    },
                    ...(branchId && { branchId }),
                },
            },
            _sum: {
                amount: true,
            },
            _count: true,
        });

        const paymentBreakdown = payments.map((p) => ({
            method: p.method,
            totalAmount: Number(p._sum.amount) || 0,
            transactionCount: p._count,
        }));

        const grandTotal = paymentBreakdown.reduce(
            (sum, p) => sum + p.totalAmount,
            0,
        );

        return {
            paymentBreakdown,
            grandTotal: Number(grandTotal.toFixed(2)),
            dateRange: { from, to },
            branchId: branchId || null,
        };
    }

    /**
     * Orders Report - Order counts by status
     */
    async getOrdersReport(tenantId: string, query: ReportQueryDto) {
        const { from, to, branchId } = query;

        const orders = await this.prisma.order.groupBy({
            by: ['status'],
            where: {
                tenantId,
                createdAt: {
                    gte: from,
                    lte: to,
                },
                ...(branchId && { branchId }),
            },
            _count: true,
        });

        const ordersByStatus = orders.map((o) => ({
            status: o.status,
            count: o._count,
        }));

        const totalOrders = ordersByStatus.reduce((sum, o) => sum + o.count, 0);

        return {
            ordersByStatus,
            totalOrders,
            dateRange: { from, to },
            branchId: branchId || null,
        };
    }

    /**
     * Inventory Report - Stock movements summary
     */
    async getInventoryReport(tenantId: string, query: ReportQueryDto) {
        const { from, to, branchId } = query;

        const movements = await this.prisma.inventoryHistory.groupBy({
            by: ['changeType'],
            where: {
                tenantId,
                createdAt: {
                    gte: from,
                    lte: to,
                },
                ...(branchId && { branchId }),
            },
            _sum: {
                adjustment: true,
            },
            _count: true,
        });

        const movementsByType = movements.map((m) => ({
            changeType: m.changeType,
            totalAdjustment: Number(m._sum.adjustment) || 0,
            count: m._count,
        }));

        const totalMovements = movementsByType.reduce((sum, m) => sum + m.count, 0);

        return {
            movementsByType,
            totalMovements,
            dateRange: { from, to },
            branchId: branchId || null,
        };
    }

    /**
     * Taxes Report - Tax collected grouped by tax rate
     */
    async getTaxesReport(tenantId: string, query: ReportQueryDto) {
        const { from, to, branchId } = query;

        // Get tax amounts from completed order items grouped by tax rate
        const taxesByRate = await this.prisma.orderItem.groupBy({
            by: ['taxRate'],
            where: {
                order: {
                    tenantId,
                    status: 'COMPLETED',
                    createdAt: {
                        gte: from,
                        lte: to,
                    },
                    ...(branchId && { branchId }),
                },
            },
            _sum: {
                taxAmount: true,
                total: true,
            },
            _count: true,
        });

        const taxBreakdown = taxesByRate.map((t) => ({
            taxRate: Number(t.taxRate),
            taxCollected: Number(t._sum.taxAmount) || 0,
            taxableAmount: Number(t._sum.total) || 0,
            itemCount: t._count,
        }));

        const totalTaxCollected = taxBreakdown.reduce(
            (sum, t) => sum + t.taxCollected,
            0,
        );

        // Also get tax names from the Tax model for reference
        const taxes = await this.prisma.tax.findMany({
            where: { tenantId },
            select: { id: true, name: true, rate: true },
        });

        return {
            taxBreakdown,
            totalTaxCollected: Number(totalTaxCollected.toFixed(2)),
            taxTypes: taxes.map((t) => ({
                id: t.id,
                name: t.name,
                rate: Number(t.rate),
            })),
            dateRange: { from, to },
            branchId: branchId || null,
        };
    }
}
