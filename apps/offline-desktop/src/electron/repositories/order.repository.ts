import type Database from "better-sqlite3";
import type {
  Order,
  OrderItem,
  OrderWithDetails,
  Paginated,
  Payment,
} from "../../shared/models";
import { OrderStatus } from "../../shared/enums";
import type { ListOrdersInput } from "../../shared/schemas";

const SELECT_ORDER = `
  SELECT o.*, cu.name AS customerName, u.name AS userName
  FROM orders o
  LEFT JOIN customers cu ON cu.id = o.customerId
  LEFT JOIN users u ON u.id = o.userId
`;

type OrderRow = Order;
type OrderItemRow = OrderItem & { refundedQuantity: number };

export class OrderRepository {
  constructor(private readonly db: Database.Database) {}

  list(params: ListOrdersInput): Paginated<Order> {
    const where: string[] = ["o.status != 'HELD'"];
    const args: Record<string, unknown> = {};

    if (params.search) {
      where.push("(o.orderNumber LIKE @search OR cu.name LIKE @search)");
      args.search = `%${params.search}%`;
    }
    if (params.status) {
      where.push("o.status = @status");
      args.status = params.status;
    }
    if (params.from) {
      where.push("o.createdAt >= @from");
      args.from = params.from;
    }
    if (params.to) {
      where.push("o.createdAt <= @to");
      args.to = params.to;
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const totalRow = this.db
      .prepare<Record<string, unknown>, { count: number }>(
        `SELECT COUNT(*) as count FROM orders o LEFT JOIN customers cu ON cu.id = o.customerId ${whereSql}`,
      )
      .get(args);

    const items = this.db
      .prepare<Record<string, unknown>, OrderRow>(
        `${SELECT_ORDER} ${whereSql} ORDER BY o.createdAt DESC LIMIT @limit OFFSET @offset`,
      )
      .all({
        ...args,
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
      });

    return {
      items,
      total: totalRow?.count ?? 0,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  findById(id: string): OrderWithDetails | null {
    const order = this.db
      .prepare<[string], OrderRow>(`${SELECT_ORDER} WHERE o.id = ?`)
      .get(id);
    if (!order) return null;

    return { ...order, items: this.itemsFor(id), payments: this.paymentsFor(id) };
  }

  listHeld(): OrderWithDetails[] {
    const orders = this.db
      .prepare<[], OrderRow>(
        `${SELECT_ORDER} WHERE o.status = 'HELD' ORDER BY o.createdAt DESC`,
      )
      .all();

    return orders.map((order) => ({
      ...order,
      items: this.itemsFor(order.id),
      payments: this.paymentsFor(order.id),
    }));
  }

  itemsFor(orderId: string): OrderItemRow[] {
    return this.db
      .prepare<[string], OrderItemRow>(
        "SELECT * FROM order_items WHERE orderId = ?",
      )
      .all(orderId);
  }

  paymentsFor(orderId: string): Payment[] {
    return this.db
      .prepare<[string], Payment>(
        "SELECT * FROM payments WHERE orderId = ? ORDER BY createdAt",
      )
      .all(orderId);
  }

  insertOrder(order: Order): void {
    this.db
      .prepare(
        `INSERT INTO orders (id, orderNumber, status, customerId, userId, shiftId,
            subtotal, discountType, discountValue, discountAmount, taxRate, taxAmount,
            total, amountPaid, changeDue, note, createdAt, updatedAt, completedAt)
         VALUES (@id, @orderNumber, @status, @customerId, @userId, @shiftId,
            @subtotal, @discountType, @discountValue, @discountAmount, @taxRate, @taxAmount,
            @total, @amountPaid, @changeDue, @note, @createdAt, @updatedAt, @completedAt)`,
      )
      .run(order);
  }

  updateOrder(order: Order): void {
    this.db
      .prepare(
        `UPDATE orders
         SET status = @status, customerId = @customerId, shiftId = @shiftId,
             subtotal = @subtotal, discountType = @discountType, discountValue = @discountValue,
             discountAmount = @discountAmount, taxRate = @taxRate, taxAmount = @taxAmount,
             total = @total, amountPaid = @amountPaid, changeDue = @changeDue,
             note = @note, updatedAt = @updatedAt, completedAt = @completedAt
         WHERE id = @id`,
      )
      .run(order);
  }

  insertItem(item: OrderItem): void {
    this.db
      .prepare(
        `INSERT INTO order_items (id, orderId, productId, productName, quantity,
            unitPrice, discountType, discountValue, lineTotal, note)
         VALUES (@id, @orderId, @productId, @productName, @quantity,
            @unitPrice, @discountType, @discountValue, @lineTotal, @note)`,
      )
      .run(item);
  }

  deleteItems(orderId: string): void {
    this.db.prepare("DELETE FROM order_items WHERE orderId = ?").run(orderId);
  }

  insertPayment(payment: Payment): void {
    this.db
      .prepare(
        `INSERT INTO payments (id, orderId, method, amount, createdAt)
         VALUES (@id, @orderId, @method, @amount, @createdAt)`,
      )
      .run(payment);
  }

  addRefundedQuantity(orderItemId: string, quantity: number): void {
    this.db
      .prepare(
        "UPDATE order_items SET refundedQuantity = refundedQuantity + ? WHERE id = ?",
      )
      .run(quantity, orderItemId);
  }

  insertRefund(refund: {
    id: string;
    orderId: string;
    amount: number;
    reason: string | null;
    userId: string | null;
    createdAt: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO refunds (id, orderId, amount, reason, userId, createdAt)
         VALUES (@id, @orderId, @amount, @reason, @userId, @createdAt)`,
      )
      .run(refund);
  }

  setStatus(orderId: string, status: OrderStatus, at: string): void {
    this.db
      .prepare("UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?")
      .run(status, at, orderId);
  }
}
