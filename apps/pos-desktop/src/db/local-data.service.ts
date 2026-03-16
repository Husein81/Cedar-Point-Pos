import { getDatabase } from "./database";
import type {
  CategoryDocument,
  SubcategoryDocument,
  ProductDocument,
  FloorDocument,
  TableDocument,
  CategoryRxDoc,
  SubcategoryRxDoc,
  ProductRxDoc,
  FloorRxDoc,
  TableRxDoc,
} from "./types";

export function generateLocalId(): string {
  let id = "c";
  // Generate 26 more characters to ensure we meet the minimum 24+ requirement
  for (let i = 0; i < 26; i++) {
    id += Math.floor(Math.random() * 36).toString(36);
  }
  return id;
}

function now(): string {
  return new Date().toISOString();
}

export const categoryService = {
  async findAll(tenantId?: string): Promise<CategoryDocument[]> {
    const db = await getDatabase();
    const query = db.categories.find({
      selector: {
        isDeleted: { $eq: false },
        ...(tenantId ? { tenantId: { $eq: tenantId } } : {}),
      },
      sort: [{ name: "asc" }],
    });
    const docs = await query.exec();
    return docs.map((d) => d.toJSON() as CategoryDocument);
  },

  async findAll$(tenantId?: string) {
    const db = await getDatabase();
    return db.categories.find({
      selector: {
        isDeleted: { $eq: false },
        ...(tenantId ? { tenantId: { $eq: tenantId } } : {}),
      },
      sort: [{ name: "asc" }],
    }).$;
  },

  async findById(id: string): Promise<CategoryRxDoc | null> {
    const db = await getDatabase();
    return db.categories.findOne(id).exec();
  },

  async create(
    data: Omit<
      CategoryDocument,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "isSynced"
      | "isLocalOnly"
      | "isDeleted"
    >,
  ): Promise<CategoryDocument> {
    const db = await getDatabase();
    const ts = now();
    const doc: CategoryDocument = {
      id: generateLocalId(),
      ...data,
      isDeleted: false,
      createdAt: ts,
      updatedAt: ts,
      isSynced: false,
      isLocalOnly: true,
    };
    await db.categories.insert(doc);
    return doc;
  },

  async update(
    id: string,
    patch: Partial<
      Omit<CategoryDocument, "id" | "createdAt" | "isSynced" | "isLocalOnly">
    >,
  ): Promise<CategoryRxDoc | null> {
    const db = await getDatabase();
    const doc = await db.categories.findOne(id).exec();
    if (!doc) return null;

    await doc.patch({
      ...patch,
      updatedAt: now(),
      isSynced: false,
    });
    return doc;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const doc = await db.categories.findOne(id).exec();
    if (!doc) return;
    await doc.patch({ isDeleted: true, updatedAt: now(), isSynced: false });
  },

  async upsertFromServer(data: CategoryDocument): Promise<void> {
    const db = await getDatabase();
    const existing = await db.categories.findOne(data.id).exec();

    if (existing) {
      const localUpdated = new Date(existing.updatedAt).getTime();
      const serverUpdated = new Date(data.updatedAt).getTime();
      // Server data only wins if it is newer or equal.
      if (serverUpdated < localUpdated) return;
    }

    await db.categories.upsert({
      ...data,
      isSynced: true,
      isLocalOnly: false,
    });
  },
};

export const subcategoryService = {
  async findAll(categoryId?: string): Promise<SubcategoryDocument[]> {
    const db = await getDatabase();
    const docs = await db.subcategories
      .find({
        selector: {
          isDeleted: { $eq: false },
          ...(categoryId ? { categoryId: { $eq: categoryId } } : {}),
        },
        sort: [{ name: "asc" }],
      })
      .exec();
    return docs.map((d) => d.toJSON() as SubcategoryDocument);
  },

  async findAll$(categoryId?: string) {
    const db = await getDatabase();
    return db.subcategories.find({
      selector: {
        isDeleted: { $eq: false },
        ...(categoryId ? { categoryId: { $eq: categoryId } } : {}),
      },
      sort: [{ name: "asc" }],
    }).$;
  },

  async findById(id: string): Promise<SubcategoryRxDoc | null> {
    const db = await getDatabase();
    return db.subcategories.findOne(id).exec();
  },

  async create(
    data: Omit<
      SubcategoryDocument,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "isSynced"
      | "isLocalOnly"
      | "isDeleted"
    >,
  ): Promise<SubcategoryDocument> {
    const db = await getDatabase();
    const ts = now();
    const doc: SubcategoryDocument = {
      id: generateLocalId(),
      ...data,
      isDeleted: false,
      createdAt: ts,
      updatedAt: ts,
      isSynced: false,
      isLocalOnly: true,
    };
    await db.subcategories.insert(doc);
    return doc;
  },

  async update(
    id: string,
    patch: Partial<
      Omit<SubcategoryDocument, "id" | "createdAt" | "isSynced" | "isLocalOnly">
    >,
  ): Promise<SubcategoryRxDoc | null> {
    const db = await getDatabase();
    const doc = await db.subcategories.findOne(id).exec();
    if (!doc) return null;
    await doc.patch({ ...patch, updatedAt: now(), isSynced: false });
    return doc;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const doc = await db.subcategories.findOne(id).exec();
    if (!doc) return;
    await doc.patch({ isDeleted: true, updatedAt: now(), isSynced: false });
  },

  async upsertFromServer(data: SubcategoryDocument): Promise<void> {
    const db = await getDatabase();
    const existing = await db.subcategories.findOne(data.id).exec();
    if (existing) {
      const localUpdated = new Date(existing.updatedAt).getTime();
      const serverUpdated = new Date(data.updatedAt).getTime();
      if (serverUpdated < localUpdated) return;
    }
    await db.subcategories.upsert({
      ...data,
      isSynced: true,
      isLocalOnly: false,
    });
  },
};

export interface ProductFilter {
  branchId?: string;
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
}

export const productService = {
  async findAll(filter?: ProductFilter): Promise<ProductDocument[]> {
    const db = await getDatabase();
    const selector: Record<string, unknown> = {
      isDeleted: { $eq: false },
      isActive: { $eq: true },
    };
    if (filter?.branchId) selector.branchId = { $eq: filter.branchId };
    if (filter?.categoryId) selector.categoryId = { $eq: filter.categoryId };
    if (filter?.subcategoryId)
      selector.subcategoryId = { $eq: filter.subcategoryId };

    let docs = await db.products
      .find({ selector, sort: [{ name: "asc" }] })
      .exec();

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.sku ?? "").toLowerCase().includes(q) ||
          (d.barcode ?? "").toLowerCase().includes(q),
      );
    }

    return docs.map((d) => d.toJSON() as ProductDocument);
  },

  async findAll$(filter?: Omit<ProductFilter, "search">) {
    const db = await getDatabase();
    const selector: Record<string, unknown> = {
      isDeleted: { $eq: false },
      isActive: { $eq: true },
    };
    if (filter?.branchId) selector.branchId = { $eq: filter.branchId };
    if (filter?.categoryId) selector.categoryId = { $eq: filter.categoryId };
    if (filter?.subcategoryId)
      selector.subcategoryId = { $eq: filter.subcategoryId };

    return db.products.find({ selector, sort: [{ name: "asc" }] }).$;
  },

  async findById(id: string): Promise<ProductRxDoc | null> {
    const db = await getDatabase();
    return db.products.findOne(id).exec();
  },

  async create(
    data: Omit<
      ProductDocument,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "isSynced"
      | "isLocalOnly"
      | "isDeleted"
    >,
  ): Promise<ProductDocument> {
    const db = await getDatabase();
    const ts = now();
    const doc: ProductDocument = {
      id: generateLocalId(),
      ...data,
      isDeleted: false,
      createdAt: ts,
      updatedAt: ts,
      isSynced: false,
      isLocalOnly: true,
    };
    await db.products.insert(doc);
    return doc;
  },

  async update(
    id: string,
    patch: Partial<
      Omit<ProductDocument, "id" | "createdAt" | "isSynced" | "isLocalOnly">
    >,
  ): Promise<ProductRxDoc | null> {
    const db = await getDatabase();
    const doc = await db.products.findOne(id).exec();
    if (!doc) return null;
    await doc.patch({ ...patch, updatedAt: now(), isSynced: false });
    return doc;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const doc = await db.products.findOne(id).exec();
    if (!doc) return;
    await doc.patch({ isDeleted: true, updatedAt: now(), isSynced: false });
  },

  async upsertFromServer(data: ProductDocument): Promise<void> {
    const db = await getDatabase();
    const existing = await db.products.findOne(data.id).exec();
    if (existing) {
      const localUpdated = new Date(existing.updatedAt).getTime();
      const serverUpdated = new Date(data.updatedAt).getTime();
      if (serverUpdated < localUpdated) return;
    }
    await db.products.upsert({ ...data, isSynced: true, isLocalOnly: false });
  },
};

export interface FloorFilter {
  branchId?: string;
}

export const floorService = {
  async findAll(filter?: FloorFilter): Promise<FloorDocument[]> {
    const db = await getDatabase();
    const selector: Record<string, unknown> = {
      isDeleted: { $eq: false },
    };
    if (filter?.branchId) selector.branchId = { $eq: filter.branchId };

    const docs = await db.floors
      .find({
        selector,
        sort: [{ order: "asc" }, { name: "asc" }],
      })
      .exec();

    return docs.map((d) => d.toJSON() as FloorDocument);
  },

  async findAll$(filter?: FloorFilter) {
    const db = await getDatabase();
    const selector: Record<string, unknown> = {
      isDeleted: { $eq: false },
    };
    if (filter?.branchId) selector.branchId = { $eq: filter.branchId };

    return db.floors
      .find({
        selector,
        sort: [{ order: "asc" }, { name: "asc" }],
      })
      .$;
  },

  async findById(id: string): Promise<FloorRxDoc | null> {
    const db = await getDatabase();
    return db.floors.findOne(id).exec();
  },

  async upsertFromServer(data: FloorDocument): Promise<void> {
    const db = await getDatabase();
    const existing = await db.floors.findOne(data.id).exec();
    if (existing) {
      const localUpdated = new Date(existing.updatedAt).getTime();
      const serverUpdated = new Date(data.updatedAt).getTime();
      if (serverUpdated < localUpdated) return;
    }

    await db.floors.upsert({
      ...data,
      isSynced: true,
      isLocalOnly: false,
    });
  },
};

export interface TableFilter {
  branchId?: string;
  floorId?: string;
}

export const tableService = {
  async findAll(filter?: TableFilter): Promise<TableDocument[]> {
    const db = await getDatabase();
    const selector: Record<string, unknown> = {
      isDeleted: { $eq: false },
      isActive: { $eq: true },
    };
    if (filter?.branchId) selector.branchId = { $eq: filter.branchId };
    if (filter?.floorId) selector.floorId = { $eq: filter.floorId };

    const docs = await db.tables
      .find({
        selector,
        sort: [{ tableNumber: "asc" }],
      })
      .exec();

    return docs.map((d) => d.toJSON() as TableDocument);
  },

  async findAll$(filter?: TableFilter) {
    const db = await getDatabase();
    const selector: Record<string, unknown> = {
      isDeleted: { $eq: false },
      isActive: { $eq: true },
    };
    if (filter?.branchId) selector.branchId = { $eq: filter.branchId };
    if (filter?.floorId) selector.floorId = { $eq: filter.floorId };

    return db.tables
      .find({
        selector,
        sort: [{ tableNumber: "asc" }],
      })
      .$;
  },

  async findById(id: string): Promise<TableRxDoc | null> {
    const db = await getDatabase();
    return db.tables.findOne(id).exec();
  },

  async upsertFromServer(data: TableDocument): Promise<void> {
    const db = await getDatabase();
    const existing = await db.tables.findOne(data.id).exec();
    if (existing) {
      const localUpdated = new Date(existing.updatedAt).getTime();
      const serverUpdated = new Date(data.updatedAt).getTime();
      if (serverUpdated < localUpdated) return;
    }

    await db.tables.upsert({
      ...data,
      isSynced: true,
      isLocalOnly: false,
    });
  },
};
