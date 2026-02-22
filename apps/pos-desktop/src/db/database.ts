import { createRxDatabase, addRxPlugin } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";
import { categorySchema } from "./schemas/category.schema";
import { subcategorySchema } from "./schemas/subcategory.schema";
import { productSchema } from "./schemas/product.schema";
import type { PosDatabase } from "./types";

let storage = getRxStorageDexie();

if (process.env.NODE_ENV === "development") {
  storage = wrappedValidateAjvStorage({
    storage: storage as unknown as ReturnType<typeof getRxStorageDexie>,
  }) as any;
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);

declare global {
  var __posDb: PosDatabase | undefined;
  var __posDbInitPromise: Promise<PosDatabase> | undefined;
}

function getDbRef(): PosDatabase | undefined {
  return globalThis.__posDb;
}
function setDbRef(db: PosDatabase | null) {
  globalThis.__posDb = db ?? undefined;
}
function getInitPromise(): Promise<PosDatabase> | undefined {
  return globalThis.__posDbInitPromise;
}
function setInitPromise(p: Promise<PosDatabase> | null) {
  globalThis.__posDbInitPromise = p ?? undefined;
}

async function createDatabase(): Promise<PosDatabase> {
  const db = await createRxDatabase({
    name: "pos_offline_db",
    storage,
    closeDuplicates: true,
  });

  await db.addCollections({
    categories: {
      schema: categorySchema,
      migrationStrategies: {
        1: (oldDoc) => oldDoc,
      },
    },
    subcategories: {
      schema: subcategorySchema,
      migrationStrategies: {
        1: (oldDoc) => oldDoc,
      },
    },
    products: {
      schema: productSchema,
      migrationStrategies: {
        1: (oldDoc) => oldDoc,
        2: (oldDoc) => oldDoc,
      },
    },
  });

  return db as unknown as PosDatabase;
}

export async function getDatabase(): Promise<PosDatabase> {
  const existing = getDbRef();
  if (existing) return existing;

  const pending = getInitPromise();
  if (pending) return pending;

  const promise = createDatabase()
    .then((db) => {
      setDbRef(db);
      setInitPromise(null);
      return db;
    })
    .catch((err) => {
      setInitPromise(null);
      throw err;
    });

  setInitPromise(promise);
  return promise;
}

export async function destroyDatabase(): Promise<void> {
  const db = getDbRef();
  if (db) {
    await (db as unknown as { destroy: () => Promise<boolean> }).destroy();
    setDbRef(null);
    setInitPromise(null);
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    const db = getDbRef();
    if (db) {
      await (db as unknown as { destroy: () => Promise<boolean> }).destroy();
      setDbRef(null);
    }
    setInitPromise(null);
  });
}
