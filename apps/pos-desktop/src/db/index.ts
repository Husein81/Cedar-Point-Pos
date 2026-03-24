export { getDatabase, destroyDatabase } from "./database";

export {
  categoryService,
  subcategoryService,
  productService,
  generateLocalId,
} from "./service";

export {
  syncService,
  initialSync,
  pull,
  push,
  startAutoSync,
  stopAutoSync,
} from "./sync.service";

export type {
  CategoryDocument,
  SubcategoryDocument,
  ProductDocument,
  SyncMeta,
  OrderDocument,
  OrderItemDocument,
  OrderItemModifierDocument,
  PosDatabase,
  PosCollections,
  CategoryRxDoc,
  SubcategoryRxDoc,
  ProductRxDoc,
  OrderRxDoc,
} from "./types";
