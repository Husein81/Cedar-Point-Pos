import { useAuthStore } from "@/store/authStore";
import type { Order } from "@/dto/order.dto";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 16,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#000",
  },

  center: {
    alignItems: "center",
    textAlign: "center",
  },

  title: {
    fontSize: 14,
    fontWeight: "bold",
  },

  subtitle: {
    fontSize: 8,
    color: "#444",
    marginTop: 2,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "dashed",
    marginVertical: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  section: {
    marginBottom: 8,
  },

  label: {
    color: "#444",
  },

  value: {
    fontWeight: "bold",
  },

  // Items
  itemHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
    marginBottom: 6,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
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

  modifiers: {
    fontSize: 7,
    color: "#555",
    paddingLeft: 10,
    marginBottom: 3,
  },

  // Totals
  totalsBox: {
    marginTop: 10,
    paddingTop: 6,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: "#000",
    marginTop: 6,
    paddingTop: 6,
    fontSize: 12,
    fontWeight: "bold",
  },

  // Footer
  footer: {
    marginTop: 14,
    alignItems: "center",
    fontSize: 8,
    color: "#444",
  },

  badge: {
    fontSize: 8,
    marginTop: 4,
    padding: 2,
    borderWidth: 1,
    borderColor: "#000",
  },
});

interface ReceiptPdfProps {
  order: Order;
  tenantName: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  orderNumber?: string;
  loyaltyApplied?: {
    points: number;
    discount: number;
  };
}

export const ReceiptPdf = ({
  order,
  tenantName,
  branchName,
  branchAddress,
  branchPhone,
  orderNumber,
  loyaltyApplied,
}: ReceiptPdfProps) => {
  const { user } = useAuthStore();

  const subtotal = order.items.reduce(
    (sum: number, item: { price: number; quantity: number }) =>
      sum + item.price * item.quantity,
    0,
  );

  const vat = order.includeVAT ? subtotal * 0.11 : 0;

  const discount = order.discount
    ? order.discount.type === "PERCENTAGE"
      ? (subtotal * order.discount.value) / 100
      : order.discount.value
    : 0;

  const loyaltyDiscount = loyaltyApplied?.discount || 0;

  const total = subtotal - discount + order.shippingFee + vat - loyaltyDiscount;

  return (
    <Document>
      <Page size={[226, 800]} style={styles.page}>
        {/* HEADER */}
        <View style={styles.center}>
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

        {/* ORDER INFO */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Order</Text>
            <Text style={styles.value}>{orderNumber}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text>{new Date().toLocaleString()}</Text>
          </View>

          {order.tableName && (
            <View style={styles.row}>
              <Text style={styles.label}>Table</Text>
              <Text>{order.tableName}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Cashier</Text>
            <Text>{user?.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ITEMS */}
        <View style={styles.itemHeader}>
          <Text style={styles.itemQty}>Qty</Text>
          <Text style={styles.itemName}>Item</Text>
          <Text style={styles.itemPrice}>Total</Text>
        </View>

        {order.items.map((item: any) => (
          <View key={item.id}>
            <View style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>

            {item.modifiers?.length > 0 && (
              <View style={styles.modifiers}>
                {item.modifiers.map((m: any) => (
                  <Text key={m.modifierId}>
                    + {m.name} {m.price ? `($${m.price.toFixed(2)})` : ""}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.divider} />

        {/* TOTALS */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>${subtotal.toFixed(2)}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>-${discount.toFixed(2)}</Text>
            </View>
          )}

          {loyaltyDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text>Loyalty</Text>
              <Text>-${loyaltyDiscount.toFixed(2)}</Text>
            </View>
          )}

          {order.shippingFee > 0 && (
            <View style={styles.totalRow}>
              <Text>Delivery</Text>
              <Text>${order.shippingFee.toFixed(2)}</Text>
            </View>
          )}

          {order.includeVAT && (
            <View style={styles.totalRow}>
              <Text>VAT</Text>
              <Text>${vat.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.grandTotal}>
            <View style={styles.totalRow}>
              <Text>TOTAL</Text>
              <Text>${total.toFixed(2)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text>TOTAL LBP</Text>
              <Text>{(total * 90000).toFixed(0)} L.L</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>Thank you for dining with us</Text>
          <Text>Cedar Point POS System</Text>
        </View>
      </Page>
    </Document>
  );
};

export const printReceipt = async (params: {
  order: Order;
  tenantName: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  orderNumber: string;
  loyaltyApplied?: {
    points: number;
    discount: number;
  };
}) => {
  const blob = await pdf(
    <ReceiptPdf
      order={params.order}
      tenantName={params.tenantName}
      branchName={params.branchName}
      branchAddress={params.branchAddress}
      branchPhone={params.branchPhone}
      orderNumber={params.orderNumber}
      loyaltyApplied={params.loyaltyApplied}
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 1000);
  };
};
