import type Database from "better-sqlite3";
import type { Customer, Paginated } from "../../shared/models";
import type { ListCustomersInput } from "../../shared/schemas";

type CustomerRow = Customer & { deletedAt: string | null };

const stripDeleted = ({ deletedAt: _deletedAt, ...customer }: CustomerRow): Customer =>
  customer;

export class CustomerRepository {
  constructor(private readonly db: Database.Database) {}

  list(params: ListCustomersInput): Paginated<Customer> {
    const where: string[] = ["deletedAt IS NULL"];
    const args: Record<string, unknown> = {};

    if (params.search) {
      where.push("(name LIKE @search OR phone LIKE @search OR email LIKE @search)");
      args.search = `%${params.search}%`;
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const totalRow = this.db
      .prepare<Record<string, unknown>, { count: number }>(
        `SELECT COUNT(*) as count FROM customers ${whereSql}`,
      )
      .get(args);

    const items = this.db
      .prepare<Record<string, unknown>, CustomerRow>(
        `SELECT * FROM customers ${whereSql} ORDER BY name LIMIT @limit OFFSET @offset`,
      )
      .all({
        ...args,
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
      })
      .map(stripDeleted);

    return {
      items,
      total: totalRow?.count ?? 0,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  findById(id: string): Customer | null {
    const row = this.db
      .prepare<[string], CustomerRow>(
        "SELECT * FROM customers WHERE id = ? AND deletedAt IS NULL",
      )
      .get(id);
    return row ? stripDeleted(row) : null;
  }

  insert(customer: Customer): void {
    this.db
      .prepare(
        `INSERT INTO customers (id, name, phone, email, address, loyaltyPoints, createdAt, updatedAt)
         VALUES (@id, @name, @phone, @email, @address, @loyaltyPoints, @createdAt, @updatedAt)`,
      )
      .run(customer);
  }

  update(customer: Customer): void {
    this.db
      .prepare(
        `UPDATE customers
         SET name = @name, phone = @phone, email = @email, address = @address,
             loyaltyPoints = @loyaltyPoints, updatedAt = @updatedAt
         WHERE id = @id AND deletedAt IS NULL`,
      )
      .run(customer);
  }

  softDelete(id: string, at: string): void {
    this.db
      .prepare(
        "UPDATE customers SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL",
      )
      .run(at, at, id);
  }
}
