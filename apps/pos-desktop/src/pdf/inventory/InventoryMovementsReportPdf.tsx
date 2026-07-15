import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { PdfDocument } from "../components/PdfDocument";
import { PdfTable } from "../components/PdfTable";
import { styles } from "../components/PdfStyles";

export interface InventoryMovementRowPdf {
  date: string;
  product: string;
  changeType: string;
  beforeStock: number;
  afterStock: number;
  adjustment: number;
  reason: string;
  user: string;
  branch: string;
}

export interface InventoryMovementsReportSummary {
  totalMovements: number;
  totalIncrease: number;
  totalDecrease: number;
}

export interface InventoryMovementsReportProps {
  tenantName: string;
  branchName?: string;
  dateRange: string;
  summary: InventoryMovementsReportSummary;
  movements: InventoryMovementRowPdf[];
}

export const InventoryMovementsReportPdf: React.FC<
  InventoryMovementsReportProps
> = ({ tenantName, branchName, dateRange, summary, movements }) => {
  const tableColumns = [
    { header: "Date", accessor: "date", width: "12%" },
    { header: "Product", accessor: "product", width: "15%" },
    { header: "Change Type", accessor: "changeType", width: "12%" },
    {
      header: "Before",
      accessor: "beforeStock",
      width: "8%",
      align: "right" as const,
    },
    {
      header: "After",
      accessor: "afterStock",
      width: "8%",
      align: "right" as const,
    },
    {
      header: "Adjustment",
      accessor: "adjustment",
      width: "10%",
      align: "right" as const,
    },
    { header: "User", accessor: "user", width: "12%" },
    { header: "Branch", accessor: "branch", width: "12%" },
    { header: "Reason", accessor: "reason", width: "11%" },
  ];

  return (
    <PdfDocument
      title="Inventory Movements Report"
      headerData={{
        title: "Inventory Movements Report",
        subtitle: tenantName,
        branchName: branchName,
        dateRange: dateRange,
      }}
    >
      {/* Summary Section */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Movements</Text>
          <Text style={styles.summaryValue}>{summary.totalMovements}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Increase</Text>
          <Text style={styles.summaryValue}>+{summary.totalIncrease}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Decrease</Text>
          <Text style={styles.summaryValue}>-{summary.totalDecrease}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Movements</Text>

      {/* Movements Table */}
      <PdfTable data={movements} columns={tableColumns} />
    </PdfDocument>
  );
};
