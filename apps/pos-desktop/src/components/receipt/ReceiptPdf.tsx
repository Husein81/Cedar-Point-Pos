import type { Order } from "@/dto/order.dto";
import type { TenantCurrency } from "@repo/types";
import { useAuthStore } from "@/store/authStore";
import { VAT_RATE, VAT_RATE_PERCENT_LABEL } from "@/constants/finance";
import {
  buildMultiCurrencyAmounts,
  formatCurrency,
} from "@/utils/invoiceFinancials";
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
  /**
   * Tenant currency config (base + secondaries). Amounts are stored in the base
   * currency; this drives symbol/decimals and the secondary-currency equivalent.
   * Passed in rather than fetched with a hook because the print path renders
   * this component detached, outside the React Query provider.
   */
  tenantCurrencies: TenantCurrency[];
  baseCurrencyCode: string;
  /** Public logo URL; rendered at the top of the receipt when present. */
  logoUrl?: string | null;
};

// The WinAnsi (CP1252) high range react-pdf's Helvetica can still render on top
// of Latin-1 — includes the € and other symbols. Anything outside Latin-1 +
// this set (e.g. Arabic script) has no glyph and prints as garbage.
const WINANSI_HIGH = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

const isWinAnsiRenderable = (value: string): boolean =>
  [...value].every(
    (char) => char.charCodeAt(0) <= 0xff || WINANSI_HIGH.includes(char),
  );

export const ReceiptPdf = ({
  order,
  tenantName,
  branchName,
  branchAddress,
  branchPhone,
  orderNumber,
  loyaltyApplied,
  tenantCurrencies,
  baseCurrencyCode,
  logoUrl,
}: Props) => {
  const { user } = useAuthStore();

  const baseCurrency =
    tenantCurrencies.find((tc) => tc.isDefault) ??
    tenantCurrencies.find((tc) => tc.currencyCode === baseCurrencyCode);
  // react-pdf's built-in Helvetica only draws WinAnsi (CP1252) glyphs, so a
  // non-Latin symbol like the Arabic "ل.ل" prints as garbage ("D.D"). Keep the
  // symbol when it's renderable ($, €, £), otherwise fall back to the ISO code.
  const rawSymbol = baseCurrency?.currency?.symbol;
  const baseSymbol =
    rawSymbol && isWinAnsiRenderable(rawSymbol) ? rawSymbol : baseCurrencyCode;
  const baseDecimals = baseCurrency?.currency?.decimalPlaces ?? 2;

  const money = (value: number | null | undefined): string =>
    formatCurrency(
      Number(value ?? 0),
      baseCurrencyCode,
      baseSymbol,
      baseDecimals,
    );

  const subtotal = order.items.reduce(
    (sum: number, item: { price?: number | null; quantity: number }) =>
      sum + (item.price ? Number(item.price) * item.quantity : 0),
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

  // Base currency first, then any active secondary currencies (e.g. USD).
  const secondaryTotals = buildMultiCurrencyAmounts(
    total,
    tenantCurrencies,
    baseCurrencyCode,
  ).slice(1);

  return (
    <Document>
      <Page size={[226]} style={styles.page}>
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          {/* LOGO — shown only when the tenant has one configured */}
          {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}

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

                  <Text style={styles.itemSub}>{money(item.price)} / Units</Text>
                </View>

                <Text style={styles.itemTotal}>
                  {money(item.price ? Number(item.price) * item.quantity : 0)}
                </Text>
              </View>

              {/* Modifiers */}
              {item.modifiers && item.modifiers.length > 0 && (
                <View style={styles.modifierContainer}>
                  {item.modifiers.map((m) => (
                    <Text key={m.modifierId} style={styles.modifier}>
                      + {m.name} {m.price ? `(${money(Number(m.price))})` : ""}
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

            <Text style={styles.totalValue}>{money(subtotal)}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>

              <Text style={styles.totalValue}>-{money(discount)}</Text>
            </View>
          )}

          {loyaltyDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Loyalty</Text>

              <Text style={styles.totalValue}>-{money(loyaltyDiscount)}</Text>
            </View>
          )}

          {order.shippingFee > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery</Text>

              <Text style={styles.totalValue}>{money(order.shippingFee)}</Text>
            </View>
          )}

          {order.includeVAT && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT {VAT_RATE_PERCENT_LABEL}</Text>

              <Text style={styles.totalValue}>{money(vat)}</Text>
            </View>
          )}

          <View style={styles.totalDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>Total</Text>

            <Text style={styles.grandValue}>{money(total)}</Text>
          </View>

          {/* Equivalent in each active secondary currency (e.g. USD) */}
          {secondaryTotals.map((c) => (
            <View key={c.code} style={styles.totalRow}>
              <Text style={styles.totalLabel}>≈ {c.code}</Text>

              <Text style={styles.totalValue}>{c.formatted}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Card</Text>

            <Text style={styles.totalValue}>{money(total)}</Text>
          </View>
        </View>

        {/* ================= FOOTER ================= */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{branchName}</Text>

          {branchAddress && <Text style={styles.footerSub}>{branchAddress}</Text>}

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
      tenantCurrencies={params.tenantCurrencies}
      baseCurrencyCode={params.baseCurrencyCode}
      logoUrl={params.logoUrl}
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
