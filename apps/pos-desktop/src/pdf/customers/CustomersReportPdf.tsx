import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { PdfDocument } from '../components/PdfDocument';
import { PdfTable } from '../components/PdfTable';
import { styles } from '../components/PdfStyles';
import { formatCurrency } from '../utils/formatters';

export interface CustomerReportRowPdf {
    name: string;
    email: string;
    phone: string;
    ordersCount: number;
    totalSpent: number;
    outstandingDebt: number;
    lastOrderDate: string;
}

export interface CustomersReportSummary {
    totalCustomers: number;
    activeCustomers: number;
    topCustomerName: string | null;
    topCustomerRevenue: number;
    averageCustomerSpend: number;
}

export interface CustomersReportProps {
    tenantName: string;
    branchName?: string;
    dateRange: string;
    summary: CustomersReportSummary;
    customers: CustomerReportRowPdf[];
}

export const CustomersReportPdf: React.FC<CustomersReportProps> = ({
    tenantName,
    branchName,
    dateRange,
    summary,
    customers,
}) => {
    const tableColumns = [
        { header: 'Customer', accessor: 'name', width: '20%' },
        { header: 'Email', accessor: 'email', width: '18%' },
        { header: 'Phone', accessor: 'phone', width: '15%' },
        { header: 'Orders', accessor: 'ordersCount', width: '12%', align: 'right' as const },
        { header: 'Total Spent', accessor: 'totalSpent', width: '12%', align: 'right' as const, format: formatCurrency },
        { header: 'Debt', accessor: 'outstandingDebt', width: '12%', align: 'right' as const, format: formatCurrency },
        { header: 'Last Order', accessor: 'lastOrderDate', width: '11%' },
    ];

    return (
        <PdfDocument
            title="Customers Report"
            headerData={{
                title: "Customers Report",
                subtitle: tenantName,
                branchName: branchName,
                dateRange: dateRange,
            }}
        >
            {/* Summary Section */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Customers</Text>
                    <Text style={styles.summaryValue}>{summary.totalCustomers}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Active Customers</Text>
                    <Text style={styles.summaryValue}>{summary.activeCustomers}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Top Customer</Text>
                    <Text style={styles.summaryValue}>{summary.topCustomerName || '-'}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Top Customer Revenue</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(summary.topCustomerRevenue)}</Text>
                </View>
            </View>

            {/* Second row of summary */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Avg. Customer Spend</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(summary.averageCustomerSpend)}</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Customers</Text>

            {/* Customers Table */}
            <PdfTable
                data={customers}
                columns={tableColumns}
            />
        </PdfDocument>
    );
};
