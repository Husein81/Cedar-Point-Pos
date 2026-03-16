import type { ModifierGroup, TableStatus } from "@repo/types";
import type { RxCollection, RxDatabase, RxDocument } from "rxdb";

export interface SyncMeta {
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
  isLocalOnly: boolean;
}

export interface CategoryDocument extends SyncMeta {
  id: string;
  tenantId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  colorId?: string | null;
  isDeleted: boolean;
}

export interface SubcategoryDocument extends SyncMeta {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  isDeleted: boolean;
}

export interface ProductDocument extends SyncMeta {
  id: string;
  tenantId: string;
  branchId?: string | null;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price?: string | null;
  cost?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  isModifiable: boolean;
  modifierGroups?: ModifierGroup[];
}

export interface FloorDocument extends SyncMeta {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  order: number;
  isDeleted: boolean;
}

export interface TableDocument extends SyncMeta {
  id: string;
  tableNumber: number;
  tenantId: string;
  branchId: string;
  floorId?: string | null;
  name: string;
  capacity: number;
  status: TableStatus;
  isActive: boolean;
  isDeleted: boolean;
}

// ─── RxDocument Types ─────────────────────────────────────────────────────────
export type CategoryRxDoc = RxDocument<CategoryDocument>;
export type SubcategoryRxDoc = RxDocument<SubcategoryDocument>;
export type ProductRxDoc = RxDocument<ProductDocument>;
export type FloorRxDoc = RxDocument<FloorDocument>;
export type TableRxDoc = RxDocument<TableDocument>;

// ─── Collection Types ─────────────────────────────────────────────────────────
export type CategoryCollection = RxCollection<CategoryDocument>;
export type SubcategoryCollection = RxCollection<SubcategoryDocument>;
export type ProductCollection = RxCollection<ProductDocument>;
export type FloorCollection = RxCollection<FloorDocument>;
export type TableCollection = RxCollection<TableDocument>;

// ─── Database Type ────────────────────────────────────────────────────────────
export interface PosCollections {
  categories: CategoryCollection;
  subcategories: SubcategoryCollection;
  products: ProductCollection;
  floors: FloorCollection;
  tables: TableCollection;
}

export type PosDatabase = RxDatabase<PosCollections>;
