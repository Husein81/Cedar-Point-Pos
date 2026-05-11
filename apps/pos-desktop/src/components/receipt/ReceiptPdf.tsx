import type { PaymentEntry } from "@/components/orders/PaymentForm";

import { useAuthStore } from "@/store/authStore";
import type { Order } from "@/store/orderStore";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Thermal receipt styles
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#000",
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8,
    color: "#444",
    marginBottom: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "dashed",
    marginVertical: 8,
  },
  orderInfo: {
    marginBottom: 10,
  },
  orderInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 3,
    marginBottom: 5,
    fontWeight: "bold",
  },
  itemRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  itemName: {
    flex: 2,
  },
  itemQty: {
    flex: 0.5,
    textAlign: "center",
  },
  itemPrice: {
    flex: 1,
    textAlign: "right",
  },
  itemTotal: {
    flex: 1,
    textAlign: "right",
  },
  modifierRow: {
    flexDirection: "row",
    paddingLeft: 10,
    fontSize: 7,
    color: "#444",
    marginBottom: 1,
  },
  totalsSection: {
    marginTop: 10,
    gap: 2,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: "bold",
    paddingTop: 5,
  },
  paymentsSection: {
    marginTop: 10,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
    gap: 4,
    fontSize: 8,
  },
  bold: {
    fontWeight: "bold",
  },
});

type Props = {
  order: Order;
  payments: PaymentEntry[];
  tenantName: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  orderNumber: string;
  loyaltyApplied?: {
    points: number;
    discount: number;
  };
};

export const ReceiptPdf = ({
  order,
  payments,
  tenantName,
  branchName,
  branchAddress,
  branchPhone,
  orderNumber,
  loyaltyApplied,
}: Props) => {
  const { user } = useAuthStore();
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const vatAmount = order.includeVAT ? subtotal * 0.11 : 0;
  const discountAmount = order.discount
    ? order.discount.type === "PERCENTAGE"
      ? (subtotal * order.discount.value) / 100
      : order.discount.value
    : 0;

  const loyaltyDiscount = loyaltyApplied?.discount || 0;
  const total =
    subtotal - discountAmount + order.shippingFee + vatAmount - loyaltyDiscount;

  return (
    <Document>
      <Page size={[226, 800]} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{tenantName}</Text>
          <Text style={styles.subtitle}>{branchName}</Text>
          {branchAddress && (
            <Text style={styles.subtitle}>{branchAddress}</Text>
          )}
          {branchPhone && (
            <Text style={styles.subtitle}>Tel: {branchPhone}</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Order Info */}
        <View style={styles.orderInfo}>
          <View style={styles.orderInfoRow}>
            <Text>Order #:</Text>
            <Text>{orderNumber}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text>Date:</Text>
            <Text>{new Date().toLocaleString()}</Text>
          </View>
          {order.tableName && (
            <View style={styles.orderInfoRow}>
              <Text>Table:</Text>
              <Text>{order.tableName}</Text>
            </View>
          )}
          {order.customerName && (
            <View style={styles.orderInfoRow}>
              <Text>Customer:</Text>
              <Text>{order.customerName}</Text>
            </View>
          )}
          <View style={styles.orderInfoRow}>
            <Text>Served by: </Text>
            <Text>{user?.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Items Table */}
        <View style={styles.tableHeader}>
          <Text style={styles.itemQty}>Qty</Text>
          <Text style={styles.itemName}>Item</Text>
          <Text style={styles.itemTotal}>Total</Text>
        </View>

        {order.items.map((item) => (
          <View key={item.id} wrap={false}>
            <View style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemTotal}>
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
            {item.modifiers?.map((mod) => (
              <View key={mod.modifierId} style={styles.modifierRow}>
                <Text>+ {mod.name}</Text>
                {mod.price > 0 && <Text> (${mod.price.toFixed(2)})</Text>}
              </View>
            ))}
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>${subtotal.toFixed(2)}</Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>Order Discount</Text>
              <Text>-${discountAmount.toFixed(2)}</Text>
            </View>
          )}

          {loyaltyDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text>Loyalty Discount ({loyaltyApplied?.points} pts)</Text>
              <Text>-${loyaltyDiscount.toFixed(2)}</Text>
            </View>
          )}

          {order.shippingFee > 0 && (
            <View style={styles.totalRow}>
              <Text>Shipping</Text>
              <Text>${order.shippingFee.toFixed(2)}</Text>
            </View>
          )}

          {order.includeVAT && (
            <View style={styles.totalRow}>
              <Text>VAT (11%)</Text>
              <Text>${vatAmount.toFixed(2)}</Text>
            </View>
          )}

          <View style={{ borderTopWidth: 1, borderTopColor: "#000" }}>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text>TOTAL</Text>
              <Text>L.L{(total * 90000).toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text>TOTAL</Text>
              <Text>${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payments */}
        {payments.length > 0 && (
          <View style={styles.paymentsSection}>
            <Text style={[styles.bold, { marginBottom: 3 }]}>Payments:</Text>
            {payments.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <Text>
                  {p.method} ({p.currencyCode})
                </Text>
                <Text>
                  {p.currencyCode !== "USD"
                    ? `${p.amount.toFixed(2)} (${p.currencyCode})`
                    : `$${p.amount.toFixed(2)}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your visit!</Text>
          <Text>Powered by Cedar Point</Text>
          <Text>www.cedarpoint.software</Text>
        </View>
      </Page>
    </Document>
  );
};
