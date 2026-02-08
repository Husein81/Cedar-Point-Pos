import { RefundForm, RefundHistory } from "@/components/refunds";
import {
  computeInvoiceFinancials,
  computeItemRefundInfo,
  buildMultiCurrencyAmounts,
  type CurrencyAmount,
} from "@/utils/invoiceFinancials";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { useOrder } from "@/hooks/useOrder";
import { useOrderRefunds } from "@/hooks/useRefund";
import { useModalStore } from "@/store/modalStore";
import { OrderStatus } from "@repo/types";
import { Badge, Button, Icon, Separator, Shad } from "@repo/ui";
import { Link, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { orderTypeConfig, statusConfig } from "./config";

// ─── Shared presentational helpers ───────────────────────────────

/** Render a single currency amount (primary + secondaries stacked) */
function PriceStack({
  amounts,
  className,
  negative,
}: {
  amounts: CurrencyAmount[];
  className?: string;
  negative?: boolean;
}) {
  if (amounts.length === 0) return null;
  const primary = amounts[0]!;
  const secondaries = amounts.slice(1);
  const sign = negative ? "−" : "";

  return (
    <div className={className}>
      <span className="font-semibold tabular-nums">
        {sign}
        {primary.formatted}
      </span>
      {secondaries.map((s) => (
        <span
          key={s.code}
          className="block text-xs text-muted-foreground font-mono tabular-nums"
        >
          {sign}
          {s.formatted}
        </span>
      ))}
    </div>
  );
}

/** A single financial summary row (label + value) */
function SummaryRow({
  label,
  hint,
  amounts,
  negative,
  muted,
  bold,
  large,
  icon,
}: {
  label: string;
  hint?: string;
  amounts: CurrencyAmount[];
  negative?: boolean;
  muted?: boolean;
  bold?: boolean;
  large?: boolean;
  icon?: string;
}) {
  return (
    <div className={`flex items-start justify-between ${large ? "py-1" : ""}`}>
      <div className="space-y-0.5">
        <div
          className={`flex items-center gap-1.5 ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""} ${large ? "text-base" : "text-sm"}`}
        >
          {icon && (
            <Icon name={icon} className="w-3.5 h-3.5 shrink-0 opacity-60" />
          )}
          {label}
        </div>
        {hint && (
          <p className="text-xs text-muted-foreground leading-tight">{hint}</p>
        )}
      </div>
      <PriceStack
        amounts={amounts}
        negative={negative}
        className={`text-right ${negative ? "text-destructive" : ""} ${muted ? "text-muted-foreground" : ""} ${bold ? "font-semibold" : ""} ${large ? "text-base" : "text-sm"}`}
      />
    </div>
  );
}

type ItemDiscount = { type: "PERCENTAGE" | "FIXED"; value: number };

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeItemDiscountAmount(
  item: {
    quantity: string | number;
    unitPrice: string | number;
    modifiers?: Array<{ price?: string | number | null }>;
  },
  discount?: ItemDiscount | null,
): number {
  if (!discount || discount.value <= 0) return 0;

  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const modifiersTotal = (item.modifiers ?? []).reduce(
    (sum, mod) => sum + Number(mod.price || 0),
    0,
  );

  const base = (unitPrice + modifiersTotal) * quantity;
  if (base <= 0) return 0;

  const raw =
    discount.type === "PERCENTAGE"
      ? (base * discount.value) / 100
      : discount.value;

  return Math.max(0, roundMoney(raw));
}

// ─── Main Component ──────────────────────────────────────────────

export function OrderDetailPage() {
  const { orderId } = useParams({ from: "/invoices/$orderId" });
  const { data: order, isLoading, refetch } = useOrder(orderId);
  const { openModal } = useModalStore();
  const { data: refunds } = useOrderRefunds(orderId);
  const { data: currencyData } = useTenantCurrencies();

  const baseCurrencyCode = currencyData?.baseCurrencyCode || "USD";
  const tenantCurrencies = currencyData?.currencies || [];

  // Pre-compute all financial values outside of render
  const financials = useMemo(() => {
    if (!order) return null;
    return computeInvoiceFinancials(order, refunds);
  }, [order, refunds]);

  const canRefund =
    order?.status === OrderStatus.COMPLETED ||
    order?.status === OrderStatus.PARTIALLY_REFUNDED;

  /** Build multi-currency amounts for a value */
  const mc = (value: number) =>
    buildMultiCurrencyAmounts(value, tenantCurrencies, baseCurrencyCode);

  const handleRefund = () => {
    openModal(
      "Create Refund",
      <RefundForm orderId={orderId} onSuccess={() => refetch()} />,
    );
  };

  // ── Loading / Error ──

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        <Icon
          name="LoaderCircle"
          className="w-4 h-4 animate-spin inline mr-2"
        />
        Loading invoice…
      </div>
    );
  }

  if (!order || !financials) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Invoice not found
      </div>
    );
  }

  const statusCfg = statusConfig[order.status];
  const typeCfg = orderTypeConfig[order.type];

  // ── Render ──

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Back navigation */}
      <Link
        to="/invoices"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Invoices</span>
      </Link>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">
            Invoice #{order.orderNumber ?? orderId.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            ·{" "}
            {new Date(order.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${statusCfg?.color} text-white`}>
            {statusCfg?.label}
          </Badge>
        </div>
      </div>

      {/* ── Quick Info Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <Shad.Card>
          <Shad.CardHeader className="pb-2">
            <Shad.CardTitle className="text-xs font-normal text-muted-foreground">
              Order Type
            </Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <Icon
                name={typeCfg?.icon ?? "Info"}
                className="w-4 h-4 text-primary"
              />
              <span className="font-medium">{typeCfg?.label}</span>
            </div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="pb-2">
            <Shad.CardTitle className="text-xs font-normal text-muted-foreground">
              Items
            </Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent className="pt-0">
            <span className="text-2xl font-bold tabular-nums">
              {order.items?.length ?? 0}
            </span>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="pb-2">
            <Shad.CardTitle className="text-xs font-normal text-muted-foreground">
              {financials.hasRefunds ? "Net Total" : "Total"}
            </Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent className="pt-0">
            <PriceStack
              amounts={mc(
                financials.hasRefunds
                  ? financials.netTotal
                  : financials.originalTotal,
              )}
              className="text-2xl font-bold text-primary"
            />
          </Shad.CardContent>
        </Shad.Card>
      </div>

      {/* ── Two Column Layout ─────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left: Items + Financial Breakdown */}
        <div className="col-span-3 space-y-6">
          {/* ── Order Items ────────────────────────────────────── */}
          <Shad.Card>
            <Shad.CardHeader>
              <Shad.CardTitle className="text-sm flex items-center gap-2">
                <Icon name="ShoppingCart" className="w-4 h-4" />
                Order Items
              </Shad.CardTitle>
            </Shad.CardHeader>
            <Shad.CardContent className="p-0">
              <div className="divide-y">
                {order.items?.map((item) => {
                  const refundInfo = computeItemRefundInfo(item);
                  const itemDiscount = item.discount as
                    | { type: "PERCENTAGE" | "FIXED"; value: number }
                    | null
                    | undefined;
                  const modifiers = item.modifiers ?? [];
                  const itemDiscountAmount = computeItemDiscountAmount(
                    item,
                    itemDiscount,
                  );
                  const hasBreakdown =
                    modifiers.length > 0 ||
                    (itemDiscount && itemDiscount.value > 0);

                  return (
                    <div
                      key={item.id}
                      className={`px-6 py-4 transition-colors ${refundInfo.isFullyRefunded ? "opacity-50" : "hover:bg-muted/30"}`}
                    >
                      {/* ── Primary: Name + Total ── */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {item.product?.name ?? "Unknown"}
                            </span>
                            {item.product?.sku && (
                              <span className="text-xs text-muted-foreground">
                                {item.product.sku}
                              </span>
                            )}
                            {refundInfo.isFullyRefunded && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-600 border-red-500/30"
                              >
                                Fully Refunded
                              </Badge>
                            )}
                            {refundInfo.isPartiallyRefunded && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30"
                              >
                                {refundInfo.refundedQty} of{" "}
                                {refundInfo.orderedQty} refunded
                              </Badge>
                            )}
                          </div>
                          {/* ── Secondary: Qty × Unit Price ── */}
                          <p className="text-xs text-muted-foreground">
                            {Number(item.quantity)} ×{" "}
                            {mc(Number(item.unitPrice))[0]?.formatted}
                          </p>
                        </div>
                        <PriceStack
                          amounts={mc(Number(item.total))}
                          className={`text-right text-sm ${refundInfo.isFullyRefunded ? "text-muted-foreground" : ""}`}
                        />
                      </div>

                      {/* ── Tertiary: Modifiers + Item Discount ── */}
                      {hasBreakdown && (
                        <div className="mt-1.5 ml-1 space-y-0.5">
                          {/* Modifiers */}
                          {modifiers.map((mod) => (
                            <div
                              key={mod.id}
                              className="flex items-center justify-between text-xs text-muted-foreground"
                            >
                              <span className="flex items-center gap-1">
                                <span className="opacity-40">+</span>
                                {mod.modifier?.name ?? "Modifier"}
                              </span>
                              <span className="tabular-nums">
                                {mc(Number(mod.price))[0]?.formatted}
                              </span>
                            </div>
                          ))}

                          {/* Item-level discount */}
                          {itemDiscountAmount > 0 && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="opacity-40">−</span>
                                Discount
                                {itemDiscount?.type === "PERCENTAGE"
                                  ? ` (${itemDiscount.value}%)`
                                  : ""}
                              </span>
                              <span className="tabular-nums text-destructive/70">
                                −{mc(itemDiscountAmount)[0]?.formatted}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Shad.CardContent>
          </Shad.Card>

          {/* ── Financial Breakdown ────────────────────────────── */}
          <Shad.Card>
            <Shad.CardHeader>
              <Shad.CardTitle className="text-sm">
                Financial Summary
              </Shad.CardTitle>
            </Shad.CardHeader>
            <Shad.CardContent className="space-y-0">
              {/* ── Subtotal ───────────────────────────────────── */}
              <div className="pb-4">
                <SummaryRow
                  label="Subtotal"
                  amounts={mc(financials.subtotal)}
                  muted
                />
              </div>

              {/* ── Adjustments ─────────────────────────────────── */}
              <div className="space-y-2 border-t pt-4 pb-4">
                <SummaryRow
                  label="Discount"
                  amounts={mc(financials.discount)}
                  negative={financials.discount > 0}
                  muted={financials.discount === 0}
                  icon="Tag"
                />
                <SummaryRow
                  label="Shipping"
                  amounts={mc(financials.shippingFee)}
                  muted={financials.shippingFee === 0}
                  icon="Truck"
                />
                <SummaryRow
                  label={
                    financials.hasVat ? `VAT (${financials.vatLabel})` : "VAT"
                  }
                  amounts={mc(financials.vatAmount)}
                  muted={financials.vatAmount === 0}
                  icon="Receipt"
                />
              </div>

              {/* ── Totals ─────────────────────────────────────── */}
              <div className="space-y-3 border-t pt-4">
                <SummaryRow
                  label={financials.hasRefunds ? "Original Total" : "Total"}
                  amounts={mc(financials.originalTotal)}
                  bold
                  large
                  muted={financials.hasRefunds}
                />

                <SummaryRow
                  label={
                    financials.hasRefunds
                      ? `Refunded (${financials.refundCount})`
                      : "Refunds"
                  }
                  amounts={mc(financials.totalRefunded)}
                  negative={financials.totalRefunded > 0}
                  muted={financials.totalRefunded === 0}
                  icon="RotateCcw"
                />

                {financials.hasRefunds && (
                  <>
                    <Separator />
                    <SummaryRow
                      label="Net Total"
                      amounts={mc(financials.netTotal)}
                      bold
                      large
                    />
                  </>
                )}
              </div>
            </Shad.CardContent>
          </Shad.Card>

          {/* ── Actions ────────────────────────────────────────── */}
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            {canRefund && (
              <Button onClick={handleRefund} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Create Refund
              </Button>
            )}
          </div>
        </div>

        {/* Right: Refund History */}
        <div className="col-span-2">
          <RefundHistory orderId={orderId} />
        </div>
      </div>
    </div>
  );
}
