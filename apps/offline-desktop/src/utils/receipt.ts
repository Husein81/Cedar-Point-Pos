// Renders an order as a thermal-width HTML receipt and sends it to the
// system print dialog via a hidden iframe. No PDF library needed — the
// printed page IS the receipt, so the browser/OS print dialog handles paper
// size (thermal roll width via @page, or A4/Letter if the user picks that
// printer).
import type { OrderWithDetails, Settings } from "@/shared/models";
import { formatDate, formatMoney } from "./format";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildReceiptHtml = (
  order: OrderWithDetails,
  settings: Settings,
): string => {
  const symbol = settings.currencySymbol;
  const widthMm = settings.receiptWidthMm || 80;

  const itemsHtml = order.items
    .map((item) => {
      const noteHtml = item.note
        ? `<div class="note">${escapeHtml(item.note)}</div>`
        : "";
      return `
        <div class="line">
          <span class="line-name">${escapeHtml(item.quantity + "x " + item.productName)}</span>
          <span class="line-total">${formatMoney(item.lineTotal, symbol)}</span>
        </div>
        ${noteHtml}
      `;
    })
    .join("");

  const paymentsHtml = order.payments
    .map(
      (payment) => `
        <div class="line">
          <span>${escapeHtml(payment.method)}</span>
          <span>${formatMoney(payment.amount, symbol)}</span>
        </div>
      `,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${escapeHtml(order.orderNumber)}</title>
<style>
  @page { size: ${widthMm}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: "Courier New", monospace;
    font-size: 12px;
    width: ${widthMm}mm;
    margin: 0;
    padding: 4mm;
    color: #000;
  }
  .center { text-align: center; }
  .business-name { font-size: 15px; font-weight: bold; }
  .muted { color: #333; font-size: 11px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .line { display: flex; justify-content: space-between; gap: 8px; }
  .line-name { flex: 1; word-break: break-word; }
  .line-total { white-space: nowrap; }
  .note { font-size: 10px; color: #555; padding-left: 8px; }
  .totals .line { padding: 1px 0; }
  .grand-total { font-size: 14px; font-weight: bold; }
  .footer { margin-top: 8px; font-size: 11px; }
</style>
</head>
<body>
  <div class="center">
    <div class="business-name">${escapeHtml(settings.businessName)}</div>
    ${settings.address ? `<div class="muted">${escapeHtml(settings.address)}</div>` : ""}
    ${settings.phone ? `<div class="muted">${escapeHtml(settings.phone)}</div>` : ""}
  </div>

  <div class="divider"></div>

  <div class="line"><span>Order</span><span>${escapeHtml(order.orderNumber)}</span></div>
  <div class="line"><span>Date</span><span>${escapeHtml(formatDate(order.createdAt))}</span></div>
  <div class="line"><span>Cashier</span><span>${escapeHtml(order.userName ?? "-")}</span></div>
  ${order.customerName ? `<div class="line"><span>Customer</span><span>${escapeHtml(order.customerName)}</span></div>` : ""}

  <div class="divider"></div>

  ${itemsHtml}

  <div class="divider"></div>

  <div class="totals">
    <div class="line"><span>Subtotal</span><span>${formatMoney(order.subtotal, symbol)}</span></div>
    ${order.discountAmount > 0 ? `<div class="line"><span>Discount</span><span>-${formatMoney(order.discountAmount, symbol)}</span></div>` : ""}
    ${order.taxAmount > 0 ? `<div class="line"><span>Tax</span><span>${formatMoney(order.taxAmount, symbol)}</span></div>` : ""}
    <div class="divider"></div>
    <div class="line grand-total"><span>Total</span><span>${formatMoney(order.total, symbol)}</span></div>
  </div>

  <div class="divider"></div>

  ${paymentsHtml}
  ${order.changeDue > 0 ? `<div class="line"><span>Change</span><span>${formatMoney(order.changeDue, symbol)}</span></div>` : ""}

  ${
    settings.receiptFooter
      ? `<div class="divider"></div><div class="footer center">${escapeHtml(settings.receiptFooter)}</div>`
      : ""
  }
</body>
</html>`;
};

export const printReceipt = (order: OrderWithDetails, settings: Settings) => {
  const html = buildReceiptHtml(order, settings);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    document.body.removeChild(iframe);
  };

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // The print dialog is synchronous in Electron's Chromium, so the
    // iframe can be removed right after — give it a tick to be safe.
    setTimeout(cleanup, 1000);
  };

  const doc = iframe.contentDocument;
  if (!doc) {
    cleanup();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
};
