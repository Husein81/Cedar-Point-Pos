import { api } from "@/apis/api";
import { getDatabase } from "./database";
import {
  categoryService,
  subcategoryService,
  productService,
} from "./local-data.service";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import type {
  CategoryDocument,
  SubcategoryDocument,
  ProductDocument,
} from "./types";

const PULL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const LAST_PULLED_AT_KEY = "pos_last_pulled_at";

function getLastPulledAt(): Date | null {
  const raw = localStorage.getItem(LAST_PULLED_AT_KEY);
  return raw ? new Date(raw) : null;
}

function setLastPulledAt(date: Date): void {
  localStorage.setItem(LAST_PULLED_AT_KEY, date.toISOString());
}

function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function mapServerCategory(raw: Record<string, unknown>): CategoryDocument {
  const ts = new Date().toISOString();
  return {
    id: raw.id as string,
    tenantId: (raw.tenantId as string) ?? "",
    name: raw.name as string,
    code: (raw.code as string | null) ?? null,
    description: (raw.description as string | null) ?? null,
    colorId: (raw.colorId as string | null) ?? null,
    isDeleted: Boolean(raw.isDeleted ?? false),
    // Server Category model lacks createdAt/updatedAt – use pull timestamp.
    createdAt: (raw.createdAt as string | undefined) ?? ts,
    updatedAt: (raw.updatedAt as string | undefined) ?? ts,
    isSynced: true,
    isLocalOnly: false,
  };
}

function mapServerSubcategory(
  raw: Record<string, unknown>,
  categoryId: string,
): SubcategoryDocument {
  const ts = new Date().toISOString();
  return {
    id: raw.id as string,
    categoryId: (raw.categoryId as string | undefined) ?? categoryId,
    name: raw.name as string,
    description: (raw.description as string | null) ?? null,
    isDeleted: Boolean(raw.isDeleted ?? false),
    createdAt: (raw.createdAt as string | undefined) ?? ts,
    updatedAt: (raw.updatedAt as string | undefined) ?? ts,
    isSynced: true,
    isLocalOnly: false,
  };
}

function mapServerProduct(raw: Record<string, unknown>): ProductDocument {
  const ts = (raw.createdAt as string | undefined) ?? new Date().toISOString();
  return {
    id: raw.id as string,
    tenantId: (raw.tenantId as string) ?? "",
    branchId: (raw.branchId as string | null) ?? null,
    name: raw.name as string,
    description: (raw.description as string | null) ?? null,
    imageUrl: (raw.imageUrl as string | null) ?? null,
    sku: (raw.sku as string | null) ?? null,
    barcode: (raw.barcode as string | null) ?? null,
    price: raw.price != null ? String(raw.price) : null,
    cost: raw.cost != null ? String(raw.cost) : null,
    categoryId: (raw.categoryId as string | null) ?? null,
    subcategoryId: (raw.subcategoryId as string | null) ?? null,
    isActive: Boolean(raw.isActive ?? true),
    isDeleted: Boolean(raw.isDeleted ?? false),
    isModifiable: Boolean(raw.isModifiable ?? false),
    createdAt: ts,
    // Products lack updatedAt on the server – use createdAt as proxy.
    updatedAt: (raw.updatedAt as string | undefined) ?? ts,
    isSynced: true,
    isLocalOnly: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PULL  (server → local)
// ─────────────────────────────────────────────────────────────────────────────
async function pullCategories(tenantId?: string): Promise<void> {
  const params: Record<string, string> = {};
  if (tenantId) params.tenantId = tenantId;

  const response = await api.get<
    Record<string, unknown>[] | { data: Record<string, unknown>[] }
  >("/categories", { params });

  // Handle both direct array and paginated response
  const categoriesData = Array.isArray(response.data)
    ? response.data
    : (response.data.data ?? []);

  const categories: CategoryDocument[] = [];
  const subcategories: SubcategoryDocument[] = [];

  for (const raw of categoriesData) {
    categories.push(mapServerCategory(raw));

    const nested =
      (raw.subcategories as Record<string, unknown>[] | undefined) ?? [];
    for (const sub of nested) {
      subcategories.push(mapServerSubcategory(sub, raw.id as string));
    }
  }

  await Promise.all(categories.map((c) => categoryService.upsertFromServer(c)));
  await Promise.all(
    subcategories.map((s) => subcategoryService.upsertFromServer(s)),
  );
}

async function pullProducts(
  tenantId?: string,
  branchId?: string,
): Promise<void> {
  const params: Record<string, string> = {};
  if (tenantId) params.tenantId = tenantId;
  if (branchId) params.branchId = branchId;

  const response = await api.get<
    Record<string, unknown>[] | { data: Record<string, unknown>[] }
  >("/products", { params });

  // Handle both direct array and paginated response
  const productsData = Array.isArray(response.data)
    ? response.data
    : (response.data.data ?? []);

  const products = productsData.map(mapServerProduct);

  // For modifiable products, fetch and embed modifiers
  const productsWithModifiers = await Promise.all(
    products.map(async (product) => {
      if (!product.isModifiable) {
        return product;
      }

      try {
        const modifiersResponse = await api.get<Record<string, unknown>>(
          `/products/${product.id}/modifiers`,
        );

        const responseData = modifiersResponse.data as Record<string, unknown>;
        const modifierGroups = (responseData.modifierGroups ??
          responseData.data) as Record<string, unknown>[];

        if (Array.isArray(modifierGroups) && modifierGroups.length > 0) {
          return {
            ...product,
            modifierGroups: modifierGroups.map((group: any) => ({
              id: group.id,
              name: group.name,
              type: group.type,
              modifiers: (group.modifiers ?? []).map((mod: any) => ({
                id: mod.id,
                name: mod.name,
                price: String(mod.price ?? "0"),
                groupId: mod.groupId ?? group.id,
              })),
            })),
          };
        }

        return product;
      } catch (err) {
        console.warn(
          `[SyncService] Failed to fetch modifiers for product ${product.id}:`,
          err,
        );
        return product;
      }
    }),
  );

  await Promise.all(
    productsWithModifiers.map((p) => productService.upsertFromServer(p)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUSH  (local → server)
// ─────────────────────────────────────────────────────────────────────────────
async function pushCategories(): Promise<void> {
  const db = await getDatabase();
  const unsynced = await db.categories
    .find({ selector: { isSynced: { $eq: false } } })
    .exec();

  for (const doc of unsynced) {
    try {
      const payload = {
        id: doc.id,
        name: doc.name,
        code: doc.code ?? undefined,
        description: doc.description ?? undefined,
        colorId: doc.colorId ?? undefined,
        isDeleted: doc.isDeleted,
      };

      if (doc.isLocalOnly && !doc.isDeleted) {
        await api.post("/categories", payload);
      } else if (!doc.isLocalOnly && doc.isDeleted) {
        await api.delete(`/categories/${doc.id}`);
      } else if (!doc.isLocalOnly) {
        await api.put(`/categories/${doc.id}`, payload);
      }

      await doc.patch({ isSynced: true, isLocalOnly: false });
    } catch (err) {
      console.warn(`[SyncService] Failed to push category ${doc.id}:`, err);
    }
  }
}

async function pushSubcategories(): Promise<void> {
  const db = await getDatabase();
  const unsynced = await db.subcategories
    .find({ selector: { isSynced: { $eq: false } } })
    .exec();

  for (const doc of unsynced) {
    try {
      const payload = {
        id: doc.id,
        name: doc.name,
        description: doc.description ?? undefined,
        isDeleted: doc.isDeleted,
      };

      if (doc.isLocalOnly && !doc.isDeleted) {
        await api.post(`/categories/${doc.categoryId}/subcategories`, payload);
      } else if (!doc.isLocalOnly && doc.isDeleted) {
        await api.delete(`/subcategories/${doc.id}`);
      } else if (!doc.isLocalOnly) {
        await api.put(`/subcategories/${doc.id}`, payload);
      }

      await doc.patch({ isSynced: true, isLocalOnly: false });
    } catch (err) {
      console.warn(`[SyncService] Failed to push subcategory ${doc.id}:`, err);
    }
  }
}

async function pushProducts(): Promise<void> {
  const db = await getDatabase();
  const unsynced = await db.products
    .find({ selector: { isSynced: { $eq: false } } })
    .exec();

  for (const doc of unsynced) {
    try {
      const payload = {
        id: doc.id,
        branchId: doc.branchId ?? undefined,
        name: doc.name,
        description: doc.description ?? undefined,
        imageUrl: doc.imageUrl ?? undefined,
        sku: doc.sku ?? undefined,
        barcode: doc.barcode ?? undefined,
        price: doc.price ?? undefined,
        cost: doc.cost ?? undefined,
        categoryId: doc.categoryId ?? undefined,
        subcategoryId: doc.subcategoryId ?? undefined,
        isActive: doc.isActive,
        isDeleted: doc.isDeleted,
        isModifiable: doc.isModifiable,
      };

      if (doc.isLocalOnly && !doc.isDeleted) {
        await api.post("/products", payload);
      } else if (!doc.isLocalOnly && doc.isDeleted) {
        await api.delete(`/products/${doc.id}`);
      } else if (!doc.isLocalOnly) {
        await api.put(`/products/${doc.id}`, payload);
      }

      await doc.patch({ isSynced: true, isLocalOnly: false });
    } catch (err) {
      console.warn(`[SyncService] Failed to push product ${doc.id}:`, err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
export interface SyncOptions {
  tenantId?: string;
  branchId?: string;
}

export interface SyncResult {
  success: boolean;
  error?: unknown;
}

export async function initialSync(
  options: SyncOptions = {},
): Promise<SyncResult> {
  if (!isOnline()) {
    console.info("[SyncService] Offline – skipping initial sync.");
    return { success: false, error: "offline" };
  }

  try {
    await pullCategories(options.tenantId);
    await pullProducts(options.tenantId, options.branchId);
    setLastPulledAt(new Date());

    await pushCategories();
    await pushSubcategories();
    await pushProducts();

    console.info("[SyncService] Initial sync complete.");
    return { success: true };
  } catch (err) {
    console.error("[SyncService] Initial sync failed:", err);
    return { success: false, error: err };
  }
}

export async function pull(options: SyncOptions = {}): Promise<SyncResult> {
  if (!isOnline()) return { success: false, error: "offline" };

  try {
    await pullCategories(options.tenantId);
    await pullProducts(options.tenantId, options.branchId);
    setLastPulledAt(new Date());
    return { success: true };
  } catch (err) {
    console.error("[SyncService] Pull failed:", err);
    return { success: false, error: err };
  }
}

export async function push(): Promise<SyncResult> {
  if (!isOnline()) return { success: false, error: "offline" };

  try {
    await pushCategories();
    await pushSubcategories();
    await pushProducts();
    return { success: true };
  } catch (err) {
    console.error("[SyncService] Push failed:", err);
    return { success: false, error: err };
  }
}

/**
 * Syncs categories for the current user's tenant and branch.
 * Fetches categories from the server and adds them to IndexedDB.
 * Uses the tenant ID from the authenticated user and optionally the branch ID.
 */
export async function syncCategoriesForCurrentTenant(): Promise<SyncResult> {
  if (!isOnline()) {
    console.info("[SyncService] Offline – skipping category sync.");
    return { success: false, error: "offline" };
  }

  try {
    const user = useAuthStore.getState().user;

    if (!user || !user.tenantId) {
      console.warn(
        "[SyncService] No authenticated user or tenant found – skipping category sync.",
      );
      return { success: false, error: "no-tenant" };
    }

    const branchId = useBranchStore.getState().branchId;

    console.info(
      `[SyncService] Syncing categories for tenant: ${user.tenantId}, branch: ${branchId || "none"}`,
    );

    await pullCategories(user.tenantId);
    setLastPulledAt(new Date());

    console.info("[SyncService] Category sync complete.");
    return { success: true };
  } catch (err) {
    console.error("[SyncService] Category sync failed:", err);
    return { success: false, error: err };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-SYNC
// ─────────────────────────────────────────────────────────────────────────────
let _pullIntervalId: ReturnType<typeof setInterval> | null = null;
let _onlineHandler: (() => void) | null = null;

export function startAutoSync(
  options: SyncOptions & { pullIntervalMs?: number } = {},
): () => void {
  const interval = options.pullIntervalMs ?? PULL_INTERVAL_MS;

  _pullIntervalId = setInterval(() => {
    pull(options).catch(console.error);
  }, interval);

  _onlineHandler = () => {
    console.info("[SyncService] Back online – pushing pending changes.");
    push().catch(console.error);
  };
  window.addEventListener("online", _onlineHandler);

  return () => stopAutoSync();
}

export function stopAutoSync(): void {
  if (_pullIntervalId !== null) {
    clearInterval(_pullIntervalId);
    _pullIntervalId = null;
  }
  if (_onlineHandler) {
    window.removeEventListener("online", _onlineHandler);
    _onlineHandler = null;
  }
}

export const syncService = {
  initialSync,
  pull,
  push,
  syncCategoriesForCurrentTenant,
  startAutoSync,
  stopAutoSync,
  getLastPulledAt,
};
