export { getDatabase, destroyDatabase } from "./database";

export {
  categoryService,
  subcategoryService,
  productService,
  generateLocalId,
} from "./local-data.service";

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
  PosDatabase,
  PosCollections,
  CategoryRxDoc,
  SubcategoryRxDoc,
  ProductRxDoc,
} from "./types";
