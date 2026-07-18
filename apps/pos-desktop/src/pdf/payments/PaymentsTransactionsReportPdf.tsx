import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { PdfDocument } from "../components/PdfDocument";
import { PdfTable } from "../components/PdfTable";
import { styles } from "../components/PdfStyles";
import { formatCurrency } from "../utils/formatters";

export interface PaymentTransactionRowPdf {
  date: string;
  orderNumber: string;
  method: string;
  amount: number;
  currency: string;
  exchangeRate: string;
  branch: string;
  cashier: string;
  orderType: string;
  orderStatus: string;
}

export interface PaymentsTransactionsReportSummary {
  totalTransactions: number;
  totalAmount: number;
  byMethod: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
}

export interface PaymentsTransactionsReportProps {
  tenantName: string;
  branchName?: string;
  dateRange: string;
  summary: PaymentsTransactionsReportSummary;
  transactions: PaymentTransactionRowPdf[];
}

export const PaymentsTransactionsReportPdf: React.FC<
  PaymentsTransactionsReportProps
> = ({ tenantName, branchName, dateRange, summary, transactions }) => {
  const tableColumns = [
    { header: "Date", accessor: "date", width: "10%" },
    { header: "Order #", accessor: "orderNumber", width: "10%" },
    { header: "Method", accessor: "method", width: "10%" },
    {
      header: "Amount",
      accessor: "amount",
      width: "10%",
      align: "right" as const,
      format: formatCurrency,
    },
    { header: "Currency", accessor: "currency", width: "8%" },
    { header: "Exch. Rate", accessor: "exchangeRate", width: "9%" },
    { header: "Branch", accessor: "branch", width: "12%" },
    { header: "Cashier", accessor: "cashier", width: "11%" },
    { header: "Type", accessor: "orderType", width: "10%" },
    { header: "Status", accessor: "orderStatus", width: "10%" },
  ];

  return (
    <PdfDocument
      title="Payments Transactions Report"
      headerData={{
        title: "Payments Transactions Report",
        subtitle: tenantName,
        branchName: branchName,
        dateRange: dateRange,
      }}
    >
      {/* Summary Section */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Transactions</Text>
          <Text style={styles.summaryValue}>{summary.totalTransactions}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Amount</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(summary.totalAmount)}
          </Text>
        </View>
      </View>

      {/* Method Breakdown */}
      {summary.byMethod.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>Payment Methods Breakdown</Text>
          {summary.byMethod.map((item, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 4,
                paddingHorizontal: 8,
              }}
            >
              <Text style={{ fontSize: 10, width: "40%" }}>{item.method}</Text>
              <Text style={{ fontSize: 10, width: "30%" }}>
                {item.count} transactions
              </Text>
              <Text style={{ fontSize: 10, width: "30%", textAlign: "right" }}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Transactions</Text>

      {/* Transactions Table */}
      <PdfTable data={transactions} columns={tableColumns} />
    </PdfDocument>
  );
};
