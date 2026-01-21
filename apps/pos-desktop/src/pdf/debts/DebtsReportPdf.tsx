import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { PdfDocument } from '../components/PdfDocument';
import { PdfTable } from '../components/PdfTable';
import { styles } from '../components/PdfStyles';
import { formatCurrency } from '../utils/formatters';

export interface DebtsOrderRowPdf {
    orderNumber: string;
    date: string;
    branch: string;
    type: string;
    subtotal: number;
    discount: number;
    total: number;
    customer: string;
    cashier: string;
}

export interface DebtsReportSummary {
    totalDebts: number;
    unpaidOrders: number;
    topDebtorName: string | null;
    topDebtorAmount: number;
}

export interface DebtsReportProps {
    tenantName: string;
    branchName?: string;
    dateRange: string;
    summary: DebtsReportSummary;
    orders: DebtsOrderRowPdf[];
}

export const DebtsReportPdf: React.FC<DebtsReportProps> = ({
    tenantName,
    branchName,
    dateRange,
    summary,
    orders,
}) => {
    const tableColumns = [
        { header: 'Order #', accessor: 'orderNumber', width: '15%' },
        { header: 'Date', accessor: 'date', width: '12%' },
        { header: 'Branch', accessor: 'branch', width: '12%' },
        { header: 'Type', accessor: 'type', width: '10%' },
        { header: 'Customer', accessor: 'customer', width: '15%' },
        { header: 'Cashier', accessor: 'cashier', width: '10%' },
        { header: 'Subtotal', accessor: 'subtotal', width: '10%', align: 'right' as const, format: formatCurrency },
        { header: 'Total', accessor: 'total', width: '10%', align: 'right' as const, format: formatCurrency },
    ];

    return (
        <PdfDocument
            title="Debts Report"
            headerData={{
                title: "Debts Report",
                subtitle: tenantName,
                branchName: branchName,
                dateRange: dateRange,
            }}
        >
            {/* Summary Section */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Debts</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(summary.totalDebts)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Unpaid Orders</Text>
                    <Text style={styles.summaryValue}>{summary.unpaidOrders}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Top Debtor</Text>
                    <Text style={styles.summaryValue}>{summary.topDebtorName || '-'}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Top Debt Amount</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(summary.topDebtorAmount)}</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Pending Orders</Text>

            {/* Orders Table */}
            <PdfTable
                data={orders}
                columns={tableColumns}
            />
        </PdfDocument>
    );
};
