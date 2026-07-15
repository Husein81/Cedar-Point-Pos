import { Text, View } from "@react-pdf/renderer";
import React from "react";
import { PdfDocument } from "../components/PdfDocument";
import { styles } from "../components/PdfStyles";
import { PdfTable } from "../components/PdfTable";
import { formatCurrency } from "../utils/formatters";

export interface SalesOrderRowPdf {
  orderNumber: string;
  date: string;
  branch: string;
  type: string;
  status: string;
  total: number;
  paymentMethods: string;
  cashier: string;
}

export interface SalesReportSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface SalesReportProps {
  tenantName: string;
  branchName?: string;
  dateRange: string;
  summary: SalesReportSummary;
  orders: SalesOrderRowPdf[];
}

export const SalesReportPdf: React.FC<SalesReportProps> = ({
  tenantName,
  branchName,
  dateRange,
  summary,
  orders,
}) => {
  const tableColumns = [
    { header: "Order #", accessor: "orderNumber", width: "15%" },
    { header: "Date", accessor: "date", width: "15%" },
    { header: "Branch", accessor: "branch", width: "15%" },
    { header: "Type", accessor: "type", width: "10%" },
    { header: "Status", accessor: "status", width: "10%" },
    { header: "Pay Method", accessor: "paymentMethods", width: "15%" },
    { header: "Cashier", accessor: "cashier", width: "10%" },
    {
      header: "Total",
      accessor: "total",
      width: "10%",
      align: "right" as const,
      format: formatCurrency,
    },
  ];

  return (
    <PdfDocument
      title="Sales Report"
      headerData={{
        title: "Sales Report",
        subtitle: tenantName,
        branchName: branchName,
        dateRange: dateRange,
      }}
    >
      {/* Summary Section */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(summary.totalRevenue)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Orders</Text>
          <Text style={styles.summaryValue}>{summary.totalOrders}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Avg. Order Value</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(summary.averageOrderValue)}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Orders</Text>

      {/* Orders Table */}
      <PdfTable data={orders} columns={tableColumns} />
    </PdfDocument>
  );
};
