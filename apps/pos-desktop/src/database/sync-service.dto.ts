import {
  BranchSchema,
  CategorySchema,
  CustomerSchema,
  InventoryHistorySchema,
  ModifierGroupSchema,
  ModifierSchema,
  OrderSchema,
  PaymentSchema,
  ProductSchema,
  RecipeSchema,
  ShiftSchema,
  SubcategorySchema,
  TaxSchema,
} from "@repo/types";
import z from "zod";

export type SyncStatus = "PENDING" | "SYNCED" | "FAILED";
export type SyncOperation = "CREATE" | "UPDATE" | "DELETE";
export type EntityType =
  | "Order"
  | "Payment"
  | "InventoryHistory"
  | "Shift"
  | "Customer";

export interface SyncOutboxRecord {
  id: string;
  tenantId: string;
  deviceId: string;
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  payload: string; // JSON string
  syncStatus: SyncStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  syncedAt: string | null;
}

export const SyncBatchSchema = z.object({
  // Transactional data (push and pull)
  orders: z.array(OrderSchema).optional(),
  payments: z.array(PaymentSchema).optional(),
  inventoryHistory: z.array(InventoryHistorySchema).optional(),
  shifts: z.array(ShiftSchema).optional(),
  customers: z.array(CustomerSchema).optional(),

  // Master data (pull only)
  products: z.array(ProductSchema).optional(),
  categories: z.array(CategorySchema).optional(),
  subcategories: z.array(SubcategorySchema).optional(),
  taxes: z.array(TaxSchema).optional(),
  branches: z.array(BranchSchema).optional(),
  modifierGroups: z.array(ModifierGroupSchema).optional(),
  modifiers: z.array(ModifierSchema).optional(),
  recipes: z.array(RecipeSchema).optional(),
});
export type SyncBatch = z.infer<typeof SyncBatchSchema>;

export interface SyncResponse {
  success: boolean;
  synced: {
    orders?: string[];
    payments?: string[];
    inventoryHistory?: string[];
    shifts?: string[];
    customers?: string[];
  };
  conflicts: {
    orders?: string[];
    payments?: string[];
    inventoryHistory?: string[];
    shifts?: string[];
    customers?: string[];
  };
  errors?: Array<{
    entityType: EntityType;
    entityId: string;
    error: string;
  }>;
}
