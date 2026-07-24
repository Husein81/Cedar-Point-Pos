import { RefundForm, RefundHistory } from "@/components/refunds";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { useOrder } from "@/hooks/useOrder";
import { useOrderRefunds } from "@/hooks/useRefund";
import { useModalStore } from "@/store/modalStore";
import {
  buildMultiCurrencyAmounts,
  computeInvoiceFinancials,
  computeItemRefundInfo,
} from "@/utils/invoiceFinancials";
import { OrderStatus } from "@repo/types";
import { Badge, Button, Icon, Separator, Shad, toast } from "@repo/ui";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { PriceStack } from "./PriceStack";
import { SummaryRow } from "./SummaryRaw";
import {
  computeItemDiscountAmount,
  orderTypeConfig,
  statusConfig,
} from "./config";
import { OrderDetailSkeleton } from "./OrderSkeleton";
import { pdf } from "@react-pdf/renderer";
import { ReceiptPdf } from "@/components/receipt/ReceiptPdf";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useBranch } from "@/hooks/useBranch";
import { mapBackendOrderToClientOrder } from "@/utils/orderMapper";
import { ReceiptPreviewModal } from "@/components/invoices/ReceiptPreviewModal";
import { BackendOrder } from "@/dto/order.dto";

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

  // Refunds only apply to closed orders; a partially refunded order stays
  // COMPLETED (refund state lives on the payment axis).
  const canRefund = order?.status === OrderStatus.COMPLETED;

  /** Build multi-currency amounts for a value */
  const mc = (value: number) =>
    buildMultiCurrencyAmounts(value, tenantCurrencies, baseCurrencyCode);

  const { user } = useAuthStore();
  const { branchId } = useBranchStore();
  const { data: branch } = useBranch(branchId || "");

  const handleRefund = () => {
    openModal(
      "Create Refund",
      <RefundForm orderId={orderId} onSuccess={() => refetch()} />,
    );
  };

  const handleExportPDF = async () => {
    if (!order) return;
    try {
      const clientOrder = mapBackendOrderToClientOrder(order as BackendOrder);
      let loyaltyApplied = undefined;
      if (order.loyaltyRedeemedPoints > 0) {
        loyaltyApplied = {
          points: order.loyaltyRedeemedPoints,
          discount: Number(order.loyaltyRedeemedAmount || 0),
        };
      }
      const blob = await pdf(
        <ReceiptPdf
          order={clientOrder}
          tenantName={user?.tenant?.name || "Cedar Point"}
          branchName={branch?.name || "Main Branch"}
          branchAddress={branch?.address || ""}
          branchPhone={branch?.phone || ""}
          orderNumber={order.orderNumber || order.id.slice(0, 8)}
          loyaltyApplied={loyaltyApplied}
          tenantCurrencies={tenantCurrencies}
          baseCurrencyCode={baseCurrencyCode}
          logoUrl={user?.tenant?.logoUrl}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${order.orderNumber || order.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF exported successfully.");
    } catch (err) {
      toast.error("Failed to export PDF.");
    }
  };

  const handlePreviewAndPrint = () => {
    if (!order) return;
    let loyaltyApplied = undefined;
    if (order.loyaltyRedeemedPoints > 0) {
      loyaltyApplied = {
        points: order.loyaltyRedeemedPoints,
        discount: Number(order.loyaltyRedeemedAmount || 0),
      };
    }
    openModal(
      `Receipt Preview #${order.orderNumber || order.id.slice(0, 8)}`,
      <ReceiptPreviewModal
        order={order}
        tenantName={user?.tenant?.name || "Cedar Point"}
        branchName={branch?.name || "Main Branch"}
        branchAddress={branch?.address || ""}
        branchPhone={branch?.phone || ""}
        orderNumber={order.orderNumber || order.id.slice(0, 8)}
        loyaltyApplied={loyaltyApplied}
      />,
    );
  };

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (!order || !financials) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        404 Invoice not found
      </div>
    );
  }

  const statusCfg = statusConfig[order.status];
  const typeCfg = orderTypeConfig[order.type];

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
            {new Date(order.createdAt).toLocaleDateString(DEFAULT_LOCALE, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            ·{" "}
            {new Date(order.createdAt).toLocaleTimeString(DEFAULT_LOCALE, {
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
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={handlePreviewAndPrint}
              className="gap-2"
            >
              <Icon name="Printer" className="w-4 h-4" />
              Print & Preview
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
