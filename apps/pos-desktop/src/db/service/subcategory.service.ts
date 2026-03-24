import _ from "lodash";
import { getDatabase } from "../database";
import { SubcategoryDocument, SubcategoryRxDoc } from "../types";
import { generateLocalId } from "./local-data.service";

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
    const ts = _.now().toLocaleString();
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
    await doc.patch({
      ...patch,
      updatedAt: _.now().toLocaleString(),
      isSynced: false,
    });
    return doc;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const doc = await db.subcategories.findOne(id).exec();
    if (!doc) return;
    await doc.patch({
      isDeleted: true,
      updatedAt: _.now().toLocaleString(),
      isSynced: false,
    });
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
