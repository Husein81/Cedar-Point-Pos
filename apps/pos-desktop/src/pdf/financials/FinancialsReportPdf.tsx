import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { PdfDocument } from '../components/PdfDocument';
import { PdfTable } from '../components/PdfTable';
import { styles } from '../components/PdfStyles';
import { formatCurrency } from '../utils/formatters';

export interface ProductProfitRowPdf {
    productName: string;
    revenue: number;
    profit: number;
    margin: number;
    qtySold?: number;
}

export interface CategoryRevenueRowPdf {
    categoryName: string;
    revenue: number;
    profit: number;
}

export interface FinancialsReportSummary {
    totalRevenue: number;
    totalProfits: number;
    totalDebts: number;
    topProfitProductName: string | null;
}

export interface FinancialsReportProps {
    tenantName: string;
    branchName?: string;
    dateRange: string;
    summary: FinancialsReportSummary;
    topProfitProducts: ProductProfitRowPdf[];
    bestSellers: ProductProfitRowPdf[];
    lowPerformance: ProductProfitRowPdf[];
    categories: CategoryRevenueRowPdf[];
}

export const FinancialsReportPdf: React.FC<FinancialsReportProps> = ({
    tenantName,
    branchName,
    dateRange,
    summary,
    topProfitProducts,
    bestSellers,
    lowPerformance,
    categories,
}) => {
    const profitProductsColumns = [
        { header: 'Product', accessor: 'productName', width: '40%' },
        { header: 'Revenue', accessor: 'revenue', width: '20%', align: 'right' as const, format: formatCurrency },
        { header: 'Profit', accessor: 'profit', width: '20%', align: 'right' as const, format: formatCurrency },
        { header: 'Margin %', accessor: 'margin', width: '20%', align: 'right' as const, format: (val: number) => `${val.toFixed(2)}%` },
    ];

    const bestSellersColumns = [
        { header: 'Product', accessor: 'productName', width: '50%' },
        { header: 'Qty Sold', accessor: 'qtySold', width: '25%', align: 'right' as const, format: (val: number) => val ? val.toString() : '-' },
        { header: 'Revenue', accessor: 'revenue', width: '25%', align: 'right' as const, format: formatCurrency },
    ];

    const categoryColumns = [
        { header: 'Category', accessor: 'categoryName', width: '40%' },
        { header: 'Revenue', accessor: 'revenue', width: '30%', align: 'right' as const, format: formatCurrency },
        { header: 'Profit', accessor: 'profit', width: '30%', align: 'right' as const, format: formatCurrency },
    ];

    return (
        <PdfDocument
            title="Financials Report"
            headerData={{
                title: "Financials Report",
                subtitle: tenantName,
                branchName: branchName,
                dateRange: dateRange,
            }}
        >
            {/* Summary Section */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Revenue</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Profits</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(summary.totalProfits)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Debts</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(summary.totalDebts)}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Top Profit Product</Text>
                    <Text style={styles.summaryValue}>{summary.topProfitProductName || '-'}</Text>
                </View>
            </View>

            {/* Top Profit Products */}
            <Text style={styles.sectionTitle}>Top 5 Profit Products</Text>
            <PdfTable
                data={topProfitProducts}
                columns={profitProductsColumns}
            />

            {/* Best Sellers */}
            <Text style={styles.sectionTitle}>Top 5 Best Sellers</Text>
            <PdfTable
                data={bestSellers}
                columns={bestSellersColumns}
            />

            {/* Low Performance Products */}
            <Text style={styles.sectionTitle}>Low Performance Products</Text>
            <PdfTable
                data={lowPerformance}
                columns={bestSellersColumns}
            />

            {/* Revenue by Category */}
            <Text style={styles.sectionTitle}>Revenue by Category</Text>
            <PdfTable
                data={categories}
                columns={categoryColumns}
            />
        </PdfDocument>
    );
};
