import type { Order } from "@/dto/order.dto";
import { useAuthStore } from "@/store/authStore";
import { VAT_RATE, VAT_RATE_PERCENT_LABEL } from "@/constants/finance";
import { Document, Page, Text, View, pdf, Image } from "@react-pdf/renderer";

import { styles } from "./style-sheet";

type Props = {
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
};

export const ReceiptPdf = ({
  order,
  tenantName,
  branchName,
  branchAddress,
  branchPhone,
  orderNumber,
  loyaltyApplied,
}: Props) => {
  const { user } = useAuthStore();

  const subtotal = order.items.reduce(
    (sum: number, item: { price: number; quantity: number }) =>
      sum + item.price * item.quantity,
    0,
  );

  const vat = order.includeVAT ? subtotal * VAT_RATE : 0;

  const discount = order.discount
    ? order.discount.type === "PERCENTAGE"
      ? (subtotal * order.discount.value) / 100
      : order.discount.value
    : 0;

  const loyaltyDiscount = loyaltyApplied?.discount || 0;

  const total = subtotal - discount + order.shippingFee + vat - loyaltyDiscount;

  return (
    <Document>
      <Page size={[226]} style={styles.page}>
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          {/* LOGO */}
          {/* Replace with your logo if available */}
          {/* <Image src="/assets/icon.png" style={[styles.logo]} /> */}

          <Text style={[styles.logoText, { paddingBottom: 2 }]}>
            {tenantName}
          </Text>

          <Text style={styles.receiptMeta}>VAT Ticket #{orderNumber}</Text>

          <Text style={styles.receiptMeta}>
            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </Text>

          <Text style={styles.receiptMeta}>
            Served by: {user?.name || "Cashier"}
          </Text>
        </View>

        {/* ================= ITEMS ================= */}
        <View style={styles.itemsContainer}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemBlock}>
              {/* Main Row */}
              <View style={styles.itemRow}>
                <Text style={styles.qty}>{item.quantity}</Text>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>

                  <Text style={styles.itemSub}>
                    ${item.price.toFixed(2)} / Units
                  </Text>
                </View>

                <Text style={styles.itemTotal}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>

              {/* Modifiers */}
              {item.modifiers && item.modifiers.length > 0 && (
                <View style={styles.modifierContainer}>
                  {item.modifiers.map((m) => (
                    <Text key={m.modifierId} style={styles.modifier}>
                      + {m.name} {m.price ? `($${m.price.toFixed(2)})` : ""}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ================= TOTALS ================= */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>

            <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>

              <Text style={styles.totalValue}>-${discount.toFixed(2)}</Text>
            </View>
          )}

          {loyaltyDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Loyalty</Text>

              <Text style={styles.totalValue}>
                -${loyaltyDiscount.toFixed(2)}
              </Text>
            </View>
          )}

          {order.shippingFee > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery</Text>

              <Text style={styles.totalValue}>
                ${order.shippingFee.toFixed(2)}
              </Text>
            </View>
          )}

          {order.includeVAT && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT {VAT_RATE_PERCENT_LABEL}</Text>

              <Text style={styles.totalValue}>${vat.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.totalDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>Total</Text>

            <Text style={styles.grandValue}>${total.toFixed(2)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Card</Text>

            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* ================= FOOTER ================= */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{branchName}</Text>

          {branchAddress && (
            <Text style={styles.footerSub}>{branchAddress}</Text>
          )}

          {branchPhone && <Text style={styles.footerSub}>{branchPhone}</Text>}

          <Text style={styles.powered}>Powered by Cedar Point POS</Text>
        </View>
      </Page>
    </Document>
  );
};

export const printReceipt = async (
  params: Props & {
    orderNumber: string;
  },
) => {
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
