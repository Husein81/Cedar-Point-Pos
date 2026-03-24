import _ from "lodash";
import { getDatabase } from "../database";
import { CategoryDocument, CategoryRxDoc } from "../types";
import { generateLocalId } from "./local-data.service";

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
    const ts = _.now().toLocaleString();
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
      updatedAt: _.now().toLocaleString(),
      isSynced: false,
    });
    return doc;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const doc = await db.categories.findOne(id).exec();
    if (!doc) return;
    await doc.patch({
      isDeleted: true,
      updatedAt: _.now().toLocaleString(),
      isSynced: false,
    });
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
