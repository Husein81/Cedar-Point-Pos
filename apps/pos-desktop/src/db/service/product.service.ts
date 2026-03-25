import _ from "lodash";
import { getDatabase } from "../database";
import type { ProductDocument, ProductRxDoc } from "../types";
import { generateLocalId } from "./local-data.service";

export type ProductFilter = {
  branchId?: string;
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
};

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
    const ts = _.now().toLocaleString();
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
    await doc.patch({
      ...patch,
      updatedAt: _.now().toLocaleString(),
      isSynced: false,
    });
    return doc;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const doc = await db.products.findOne(id).exec();
    if (!doc) return;
    await doc.patch({
      isDeleted: true,
      updatedAt: _.now().toLocaleString(),
      isSynced: false,
    });
  },

  async upsertFromServer(data: ProductDocument): Promise<void> {
    const db = await getDatabase();
    const existing = await db.products.findOne(data.id).exec();
    if (existing) {
      const localUpdated = new Date(existing.updatedAt).getTime();
      const serverUpdated = new Date(data.updatedAt).getTime();
      if (serverUpdated < localUpdated) return;
    }
    await db.products.upsert({
      ...data,
      isSynced: true,
      isLocalOnly: false,
    });
  },
};
