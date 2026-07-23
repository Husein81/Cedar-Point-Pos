import type Database from "better-sqlite3";
import type { Paginated, StockMovement } from "../../shared/models";
import type { ListStockMovementsInput } from "../../shared/schemas";

const SELECT_MOVEMENT = `
  SELECT m.*, p.name AS productName
  FROM stock_movements m
  LEFT JOIN products p ON p.id = m.productId
`;

export class StockRepository {
  constructor(private readonly db: Database.Database) {}

  list(params: ListStockMovementsInput): Paginated<StockMovement> {
    const where: string[] = ["1=1"];
    const args: Record<string, unknown> = {};

    if (params.productId) {
      where.push("m.productId = @productId");
      args.productId = params.productId;
    }
    if (params.type) {
      where.push("m.type = @type");
      args.type = params.type;
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const totalRow = this.db
      .prepare<Record<string, unknown>, { count: number }>(
        `SELECT COUNT(*) as count FROM stock_movements m ${whereSql}`,
      )
      .get(args);

    const items = this.db
      .prepare<Record<string, unknown>, StockMovement>(
        `${SELECT_MOVEMENT} ${whereSql} ORDER BY m.createdAt DESC LIMIT @limit OFFSET @offset`,
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

  insert(movement: StockMovement): void {
    this.db
      .prepare(
        `INSERT INTO stock_movements (id, productId, type, quantity, unitCost, reason, userId, createdAt)
         VALUES (@id, @productId, @type, @quantity, @unitCost, @reason, @userId, @createdAt)`,
      )
      .run(movement);
  }
}
