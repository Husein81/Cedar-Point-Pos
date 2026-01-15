import type { ReceiptData } from "@/apis/receiptsApi";
import { cn } from "@repo/ui";
import { forwardRef } from "react";

/**
 * Format price with currency symbol
 */
const formatPrice = (
  amount: number,
  symbol: string,
  decimals: number
): string => {
  const formatted = amount.toFixed(decimals);
  // For LBP, format with thousand separators
  if (decimals === 0) {
    return `${symbol} ${Number(formatted).toLocaleString("en-US")}`;
  }
  return `${symbol}${formatted}`;
};

/**
 * Format date for receipt
 */
const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format time for receipt
 */
const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Order type labels
 */
const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine In",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
  RETAIL: "Retail",
};

/**
 * Payment method labels
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  CREDIT: "Credit",
  VOUCHER: "Voucher",
  ONLINE: "Online",
};

interface ReceiptProps {
  data: ReceiptData;
  className?: string;
}

/**
 * Receipt Component
 *
 * Optimized for thermal printers (80mm width = ~48 characters)
 * Uses monospace font for alignment
 * Supports both LTR and RTL text
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ data, className }, ref) => {
    const {
      currency,
      totals,
      tenant,
      branch,
      order,
      cashier,
      customer,
      items,
      payments,
      footer,
    } = data;
    const { baseCurrencySymbol: symbol, decimalPlaces: decimals } = currency;

    return (
      <div
        ref={ref}
        className={cn(
          // Thermal receipt styling
          "receipt-container",
          "w-[80mm] min-h-[100mm] bg-white text-black",
          "font-mono text-[11px] leading-tight",
          "p-3 print:p-0",
          className
        )}
        style={{
          // Prevent page breaks inside receipt elements
          pageBreakInside: "avoid",
        }}
      >
        {/* ============ HEADER ============ */}
        <div className="text-center mb-3">
          {/* Tenant Name */}
          <div className="text-base font-bold uppercase tracking-wide">
            {tenant.name}
          </div>

          {/* Branch Info */}
          <div className="text-[10px] mt-1">
            <div className="font-semibold">{branch.name}</div>
            {branch.address && <div>{branch.address}</div>}
            {branch.phone && <div>Tel: {branch.phone}</div>}
          </div>
        </div>

        {/* Divider */}
        <div className="receipt-divider border-t border-dashed border-black my-2" />

        {/* ============ ORDER INFO ============ */}
        <div className="mb-2">
          {/* Order Number - Large */}
          <div className="text-center text-lg font-bold mb-1">
            #{order.orderNumber}
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-2 gap-x-2 text-[10px]">
            <div>Date: {formatDate(order.createdAt)}</div>
            <div className="text-right">
              Time: {formatTime(order.createdAt)}
            </div>
            <div>Type: {ORDER_TYPE_LABELS[order.type] || order.type}</div>
            {order.tableName && (
              <div className="text-right">Table: {order.tableName}</div>
            )}
            {cashier && <div>Cashier: {cashier.name}</div>}
          </div>

          {/* Customer Info */}
          {customer && (
            <div className="mt-1 pt-1 border-t border-dotted border-gray-400">
              <div className="text-[10px]">
                <span className="font-semibold">Customer:</span> {customer.name}
              </div>
              {customer.phone && (
                <div className="text-[10px]">Tel: {customer.phone}</div>
              )}
              {order.type === "DELIVERY" && customer.address && (
                <div className="text-[10px]">Address: {customer.address}</div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="receipt-divider border-t border-dashed border-black my-2" />

        {/* ============ ITEMS ============ */}
        <div className="mb-2">
          {/* Header */}
          <div className="flex justify-between font-bold text-[10px] mb-1 pb-1 border-b border-gray-300">
            <span className="flex-1">Item</span>
            <span className="w-8 text-center">Qty</span>
            <span className="w-16 text-right">Price</span>
            <span className="w-16 text-right">Total</span>
          </div>

          {/* Items */}
          {items.map((item) => (
            <div key={item.id} className="mb-1">
              {/* Item Row */}
              <div className="flex justify-between">
                <span className="flex-1 truncate pr-1">{item.productName}</span>
                <span className="w-8 text-center">{item.quantity}</span>
                <span className="w-16 text-right">
                  {formatPrice(item.unitPrice, symbol, decimals)}
                </span>
                <span className="w-16 text-right">
                  {formatPrice(item.subtotal, symbol, decimals)}
                </span>
              </div>

              {/* Modifiers */}
              {item.modifiers.length > 0 && (
                <div className="ml-2 text-[9px] text-gray-600">
                  {item.modifiers.map((mod, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>+ {mod.name}</span>
                      {mod.price > 0 && (
                        <span>{formatPrice(mod.price, symbol, decimals)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="ml-2 text-[9px] italic text-gray-500">
                  Note: {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="receipt-divider border-t border-dashed border-black my-2" />

        {/* ============ TOTALS ============ */}
        <div className="mb-2">
          {/* Subtotal */}
          <div className="flex justify-between text-[10px]">
            <span>Subtotal</span>
            <span>{formatPrice(totals.subtotal, symbol, decimals)}</span>
          </div>

          {/* Discount */}
          {totals.discount > 0 && (
            <div className="flex justify-between text-[10px] text-red-600">
              <span>
                Discount
                {totals.discountPercentage &&
                  ` (${totals.discountPercentage}%)`}
              </span>
              <span>-{formatPrice(totals.discount, symbol, decimals)}</span>
            </div>
          )}

          {/* Shipping */}
          {totals.shippingFee > 0 && (
            <div className="flex justify-between text-[10px]">
              <span>Delivery Fee</span>
              <span>{formatPrice(totals.shippingFee, symbol, decimals)}</span>
            </div>
          )}

          {/* Tax */}
          {totals.tax > 0 && (
            <div className="flex justify-between text-[10px]">
              <span>Tax</span>
              <span>{formatPrice(totals.tax, symbol, decimals)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between font-bold text-sm mt-1 pt-1 border-t border-gray-400">
            <span>TOTAL</span>
            <span>{formatPrice(totals.total, symbol, decimals)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="receipt-divider border-t border-dashed border-black my-2" />

        {/* ============ PAYMENTS ============ */}
        {payments.length > 0 && (
          <div className="mb-2">
            <div className="font-bold text-[10px] mb-1">Payment Details</div>
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex justify-between text-[10px]"
              >
                <span>
                  {PAYMENT_METHOD_LABELS[payment.method] || payment.method}
                </span>
                <span>
                  {payment.currencyCode !== currency.baseCurrencyCode ? (
                    <>
                      {payment.currencySymbol}
                      {payment.amount.toFixed(2)}
                      <span className="text-[8px] text-gray-500 ml-1">
                        (
                        {formatPrice(
                          payment.amountInBaseCurrency,
                          symbol,
                          decimals
                        )}
                        )
                      </span>
                    </>
                  ) : (
                    formatPrice(payment.amount, symbol, decimals)
                  )}
                </span>
              </div>
            ))}

            {/* Total Paid */}
            <div className="flex justify-between text-[10px] mt-1 pt-1 border-t border-dotted border-gray-400">
              <span className="font-semibold">Paid</span>
              <span className="font-semibold">
                {formatPrice(totals.totalPaid, symbol, decimals)}
              </span>
            </div>

            {/* Change */}
            {totals.change > 0 && (
              <div className="flex justify-between text-[10px] font-bold">
                <span>Change</span>
                <span>{formatPrice(totals.change, symbol, decimals)}</span>
              </div>
            )}

            {/* Balance Due */}
            {totals.balance > 0 && (
              <div className="flex justify-between text-[10px] text-red-600 font-bold">
                <span>Balance Due</span>
                <span>{formatPrice(totals.balance, symbol, decimals)}</span>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="receipt-divider border-t border-dashed border-black my-2" />

        {/* ============ FOOTER ============ */}
        <div className="text-center">
          {/* Thank You Message */}
          <div className="font-semibold text-[11px] mb-1">
            {footer.thankYouMessage}
          </div>

          {/* Custom Footer Text */}
          {footer.footerText && (
            <div className="text-[9px] text-gray-600 whitespace-pre-line">
              {footer.footerText}
            </div>
          )}

          {/* Receipt ID & Timestamp */}
          <div className="text-[8px] text-gray-400 mt-2">
            {data.receiptId} • {formatDate(data.printedAt)}{" "}
            {formatTime(data.printedAt)}
          </div>

          {/* Reprint Indicator */}
          {data.isReprint && (
            <div className="text-[10px] font-bold mt-1 p-1 border border-gray-400">
              *** REPRINT ***
            </div>
          )}
        </div>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";
