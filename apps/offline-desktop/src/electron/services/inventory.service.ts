import type Database from "better-sqlite3";
import type { Paginated, Product, StockMovement } from "../../shared/models";
import { StockMovementType } from "../../shared/enums";
import type {
  ListStockMovementsInput,
  StockAdjustmentInput,
  StockPurchaseInput,
} from "../../shared/schemas";
import type { ProductRepository } from "../repositories/product.repository";
import type { StockRepository } from "../repositories/stock.repository";
import { NotFoundError, ValidationError } from "../core/errors";
import { newId, nowIso } from "../core/id";
import type { SessionContext } from "./session-context";

export class InventoryService {
  constructor(
    private readonly db: Database.Database,
    private readonly products: ProductRepository,
    private readonly stock: StockRepository,
    private readonly session: SessionContext,
  ) {}

  listMovements(params: ListStockMovementsInput): Paginated<StockMovement> {
    return this.stock.list(params);
  }

  listLowStock(): Product[] {
    return this.products.listLowStock();
  }

  adjust(input: StockAdjustmentInput): StockMovement {
    const userId = this.session.requireUserId();
    const product = this.products.findById(input.productId);
    if (!product) throw new NotFoundError("Product");
    if (!product.trackInventory) {
      throw new ValidationError("Product does not track inventory");
    }

    const now = nowIso();
    const movement: StockMovement = {
      id: newId(),
      productId: product.id,
      productName: product.name,
      type: StockMovementType.ADJUSTMENT,
      quantity: input.quantity,
      unitCost: null,
      reason: input.reason,
      userId,
      createdAt: now,
    };

    const run = this.db.transaction(() => {
      this.products.adjustStock(product.id, input.quantity, now);
      this.stock.insert(movement);
    });
    run();

    return movement;
  }

  purchase(input: StockPurchaseInput): StockMovement[] {
    const userId = this.session.requireUserId();
    const now = nowIso();

    const lines = input.items.map((line) => {
      const product = this.products.findById(line.productId);
      if (!product) throw new NotFoundError(`Product (${line.productId})`);
      return { line, product };
    });

    const movements: StockMovement[] = [];

    const run = this.db.transaction(() => {
      for (const { line, product } of lines) {
        this.products.adjustStock(product.id, line.quantity, now);

        const movement: StockMovement = {
          id: newId(),
          productId: product.id,
          productName: product.name,
          type: StockMovementType.PURCHASE,
          quantity: line.quantity,
          unitCost: line.unitCost,
          reason: input.reference,
          userId,
          createdAt: now,
        };
        this.stock.insert(movement);
        movements.push(movement);
      }
    });
    run();

    return movements;
  }
}
