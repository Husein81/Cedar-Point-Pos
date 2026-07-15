import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { PdfDocument } from "../components/PdfDocument";
import { PdfTable } from "../components/PdfTable";
import { styles } from "../components/PdfStyles";
import { formatCurrency } from "../utils/formatters";

export interface TopProductRowPdf {
  productName: string;
  category: string;
  qtySold: number;
  revenue: number;
  avgUnitPrice: number;
}

export interface TopProductsReportSummary {
  totalRevenue: number;
  totalUnitsSold: number;
  topProductName: string;
}

export interface TopProductsReportProps {
  tenantName: string;
  branchName?: string;
  dateRange: string;
  summary: TopProductsReportSummary;
  products: TopProductRowPdf[];
}

export const TopProductsReportPdf: React.FC<TopProductsReportProps> = ({
  tenantName,
  branchName,
  dateRange,
  summary,
  products,
}) => {
  const tableColumns = [
    { header: "Product", accessor: "productName", width: "30%" },
    { header: "Category", accessor: "category", width: "20%" },
    {
      header: "Qty Sold",
      accessor: "qtySold",
      width: "15%",
      align: "right" as const,
    },
    {
      header: "Avg Unit Price",
      accessor: "avgUnitPrice",
      width: "17.5%",
      align: "right" as const,
      format: formatCurrency,
    },
    {
      header: "Revenue",
      accessor: "revenue",
      width: "17.5%",
      align: "right" as const,
      format: formatCurrency,
    },
  ];

  return (
    <PdfDocument
      title="Top Products Report"
      headerData={{
        title: "Top Products Report",
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
          <Text style={styles.summaryLabel}>Total Units Sold</Text>
          <Text style={styles.summaryValue}>{summary.totalUnitsSold}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Top Product</Text>
          <Text style={styles.summaryValue}>{summary.topProductName}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Top Products</Text>

      {/* Products Table */}
      <PdfTable data={products} columns={tableColumns} />
    </PdfDocument>
  );
};
