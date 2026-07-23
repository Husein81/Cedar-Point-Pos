import type Database from "better-sqlite3";
import type {
  Order,
  OrderItem,
  OrderWithDetails,
  Paginated,
  StockMovement,
} from "../../shared/models";
import {
  CashMovementType,
  OrderStatus,
  PaymentMethod,
  StockMovementType,
} from "../../shared/enums";
import type {
  CheckoutInput,
  HoldOrderInput,
  ListOrdersInput,
  RefundInput,
} from "../../shared/schemas";
import { computeOrderTotals, lineTotal, roundMoney } from "../../shared/financial";
import type { OrderRepository } from "../repositories/order.repository";
import type { ProductRepository } from "../repositories/product.repository";
import type { SettingsRepository } from "../repositories/settings.repository";
import type { ShiftRepository } from "../repositories/shift.repository";
import type { StockRepository } from "../repositories/stock.repository";
import { ConflictError, NotFoundError, ValidationError } from "../core/errors";
import { newId, nowIso } from "../core/id";
import type { SessionContext } from "./session-context";

export class OrdersService {
  constructor(
    private readonly db: Database.Database,
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly stock: StockRepository,
    private readonly shifts: ShiftRepository,
    private readonly settings: SettingsRepository,
    private readonly session: SessionContext,
  ) {}

  list(params: ListOrdersInput): Paginated<Order> {
    return this.orders.list(params);
  }

  get(id: string): OrderWithDetails {
    const order = this.orders.findById(id);
    if (!order) throw new NotFoundError("Order");
    return order;
  }

  listHeld(): OrderWithDetails[] {
    return this.orders.listHeld();
  }

  // ── checkout ────────────────────────────────────────────────────────

  checkout(input: CheckoutInput): OrderWithDetails {
    const userId = this.session.requireUserId();
    const settings = this.settings.get();
    const openShift = this.shifts.findOpen();
    const now = nowIso();

    // Resolve products up front — totals are always recomputed server-side
    // from stored data, never trusted from the client.
    const lines = input.items.map((item) => {
      const product = this.products.findById(item.productId);
      if (!product) throw new NotFoundError(`Product (${item.productId})`);
      if (!product.isActive) {
        throw new ConflictError(`"${product.name}" is inactive`, "PRODUCT_INACTIVE");
      }
      return { item, product };
    });

    const totals = computeOrderTotals({
      lines: input.items,
      discountType: input.discountType,
      discountValue: input.discountValue,
      taxRate: settings.taxRate,
    });

    const amountPaid = roundMoney(
      input.payments.reduce((sum, payment) => sum + payment.amount, 0),
    );
    if (amountPaid + 0.001 < totals.total) {
      throw new ValidationError("Payment does not cover the total");
    }
    const changeDue = roundMoney(amountPaid - totals.total);

    const run = this.db.transaction((): string => {
      // Resuming a held order converts it instead of creating a new row.
      const orderId = input.heldOrderId ?? newId();

      const invoice = this.settings.claimNextInvoiceNumber();
      const orderNumber = `${invoice.prefix}${String(invoice.number).padStart(6, "0")}`;

      const order: Order = {
        id: orderId,
        orderNumber,
        status: OrderStatus.COMPLETED,
        customerId: input.customerId,
        customerName: null,
        userId,
        userName: null,
        shiftId: openShift?.id ?? null,
        subtotal: totals.subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount: totals.discountAmount,
        taxRate: settings.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
        amountPaid,
        changeDue,
        note: input.note,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      };

      if (input.heldOrderId) {
        const held = this.orders.findById(input.heldOrderId);
        if (!held || held.status !== OrderStatus.HELD) {
          throw new NotFoundError("Held order");
        }
        this.orders.deleteItems(orderId);
        this.orders.updateOrder({ ...order, createdAt: held.createdAt });
      } else {
        this.orders.insertOrder(order);
      }

      for (const { item, product } of lines) {
        const orderItem: OrderItem = {
          id: newId(),
          orderId,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
          lineTotal: lineTotal(item),
          note: item.note,
        };
        this.orders.insertItem(orderItem);

        if (product.trackInventory) {
          this.products.adjustStock(product.id, -item.quantity, now);
          const movement: StockMovement = {
            id: newId(),
            productId: product.id,
            productName: product.name,
            type: StockMovementType.SALE,
            quantity: -item.quantity,
            unitCost: product.cost,
            reason: orderNumber,
            userId,
            createdAt: now,
          };
          this.stock.insert(movement);
        }
      }

      for (const payment of input.payments) {
        this.orders.insertPayment({
          id: newId(),
          orderId,
          method: payment.method,
          amount: payment.amount,
          createdAt: now,
        });
      }

      // Cash portion feeds the open shift's drawer.
      if (openShift) {
        const cashPaid = input.payments
          .filter((payment) => payment.method === PaymentMethod.CASH)
          .reduce((sum, payment) => sum + payment.amount, 0);
        const cashIntoDrawer = roundMoney(cashPaid - changeDue);
        if (cashIntoDrawer > 0) {
          this.shifts.insertCashMovement({
            id: newId(),
            shiftId: openShift.id,
            type: CashMovementType.SALE,
            amount: cashIntoDrawer,
            reason: orderNumber,
            userId,
            createdAt: now,
          });
        }
      }

      return orderId;
    });

    return this.get(run());
  }

  // ── hold / resume ───────────────────────────────────────────────────

  hold(input: HoldOrderInput): Order {
    const userId = this.session.requireUserId();
    const settings = this.settings.get();
    const now = nowIso();

    const lines = input.items.map((item) => {
      const product = this.products.findById(item.productId);
      if (!product) throw new NotFoundError(`Product (${item.productId})`);
      return { item, product };
    });

    const totals = computeOrderTotals({
      lines: input.items,
      discountType: input.discountType,
      discountValue: input.discountValue,
      taxRate: settings.taxRate,
    });

    const run = this.db.transaction((): string => {
      const orderId = newId();

      const order: Order = {
        id: orderId,
        // Held orders get a temporary number; the real invoice number is
        // claimed at checkout so numbers stay gapless for completed sales.
        orderNumber: `HOLD-${orderId.slice(0, 8)}`,
        status: OrderStatus.HELD,
        customerId: input.customerId,
        customerName: null,
        userId,
        userName: null,
        shiftId: null,
        subtotal: totals.subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount: totals.discountAmount,
        taxRate: settings.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
        amountPaid: 0,
        changeDue: 0,
        note: input.note,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      this.orders.insertOrder(order);

      for (const { item, product } of lines) {
        this.orders.insertItem({
          id: newId(),
          orderId,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
          lineTotal: lineTotal(item),
          note: item.note,
        });
      }

      return orderId;
    });

    const held = this.orders.findById(run());
    if (!held) throw new NotFoundError("Order");
    return held;
  }

  resume(id: string): OrderWithDetails {
    const order = this.orders.findById(id);
    if (!order || order.status !== OrderStatus.HELD) {
      throw new NotFoundError("Held order");
    }
    return order;
  }

  // ── refunds ─────────────────────────────────────────────────────────

  refund(input: RefundInput): OrderWithDetails {
    const userId = this.session.requireUserId();
    const now = nowIso();

    const order = this.orders.findById(input.orderId);
    if (!order) throw new NotFoundError("Order");
    if (
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.PARTIALLY_REFUNDED
    ) {
      throw new ConflictError("Order cannot be refunded", "NOT_REFUNDABLE");
    }

    const itemsById = new Map(order.items.map((item) => [item.id, item]));

    // Validate refund quantities against what's still refundable.
    type RefundLine = { orderItem: OrderItem & { refundedQuantity?: number }; quantity: number };
    const refundLines: RefundLine[] = input.items.map((line) => {
      const orderItem = itemsById.get(line.orderItemId) as
        | (OrderItem & { refundedQuantity?: number })
        | undefined;
      if (!orderItem) throw new NotFoundError("Order item");

      const alreadyRefunded = orderItem.refundedQuantity ?? 0;
      const refundable = orderItem.quantity - alreadyRefunded;
      if (line.quantity > refundable + 0.0001) {
        throw new ValidationError(
          `Only ${refundable} of "${orderItem.productName}" can be refunded`,
        );
      }
      return { orderItem, quantity: line.quantity };
    });

    // Refund value is proportional to the item's effective (post-discount,
    // pre-order-discount) price, scaled by the order-level discount+tax factor.
    const orderFactor = order.subtotal > 0 ? order.total / order.subtotal : 1;

    const refundAmount = roundMoney(
      refundLines.reduce((sum, line) => {
        const perUnit = line.orderItem.lineTotal / line.orderItem.quantity;
        return sum + perUnit * line.quantity * orderFactor;
      }, 0),
    );

    const run = this.db.transaction(() => {
      this.orders.insertRefund({
        id: newId(),
        orderId: order.id,
        amount: refundAmount,
        reason: input.reason,
        userId,
        createdAt: now,
      });

      for (const line of refundLines) {
        this.orders.addRefundedQuantity(line.orderItem.id, line.quantity);

        if (line.orderItem.productId) {
          const product = this.products.findById(line.orderItem.productId);
          if (product?.trackInventory) {
            this.products.adjustStock(product.id, line.quantity, now);
            this.stock.insert({
              id: newId(),
              productId: product.id,
              productName: product.name,
              type: StockMovementType.REFUND,
              quantity: line.quantity,
              unitCost: product.cost,
              reason: order.orderNumber,
              userId,
              createdAt: now,
            });
          }
        }
      }

      const allItems = this.orders.itemsFor(order.id);
      const fullyRefunded = allItems.every(
        (item) => item.refundedQuantity >= item.quantity - 0.0001,
      );
      this.orders.setStatus(
        order.id,
        fullyRefunded ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED,
        now,
      );

      // Cash refunds come out of the open drawer.
      const openShift = this.shifts.findOpen();
      if (openShift) {
        this.shifts.insertCashMovement({
          id: newId(),
          shiftId: openShift.id,
          type: CashMovementType.REFUND,
          amount: refundAmount,
          reason: order.orderNumber,
          userId,
          createdAt: now,
        });
      }
    });

    run();
    return this.get(order.id);
  }
}
