import _ from "lodash";
import { getDatabase } from "../database";
import type { TableDocument, TableRxDoc } from "../types";
import {
  clearLocalOrderTableAssignments,
  ensureUniqueTableNumber,
  ensureValidFloorAssignment,
  generateLocalId,
  listActiveLocalOrdersByTableIds,
} from "./local-data.service";
import { TableStatus } from "@repo/types";

export interface TableFilter {
  branchId?: string;
  floorId?: string;
}

async function getTableDeleteContext(id: string) {
  const db = await getDatabase();
  const doc = await db.tables.findOne(id).exec();

  if (!doc) {
    return null;
  }

  const activeOrders = await listActiveLocalOrdersByTableIds([id]);
  if (activeOrders.length > 0) {
    throw new Error(
      "Cannot delete table with active orders. Please complete or cancel all orders first.",
    );
  }

  return { doc };
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

    return db.tables.find({
      selector,
      sort: [{ tableNumber: "asc" }],
    }).$;
  },

  async findById(id: string): Promise<TableRxDoc | null> {
    const db = await getDatabase();
    return db.tables.findOne(id).exec();
  },

  async create(
    data: Omit<
      TableDocument,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "isSynced"
      | "isLocalOnly"
      | "isDeleted"
    >,
  ): Promise<TableDocument> {
    await ensureUniqueTableNumber(data.branchId, data.tableNumber);
    await ensureValidFloorAssignment(data.branchId, data.floorId);

    const db = await getDatabase();
    const ts = _.now().toLocaleString();
    const doc: TableDocument = {
      id: generateLocalId(),
      ...data,
      isDeleted: false,
      createdAt: ts,
      updatedAt: ts,
      isSynced: false,
      isLocalOnly: true,
    };

    await db.tables.insert(doc);
    return doc;
  },

  async update(
    id: string,
    patch: Partial<
      Omit<TableDocument, "id" | "createdAt" | "isSynced" | "isLocalOnly">
    >,
  ): Promise<TableRxDoc | null> {
    const db = await getDatabase();
    const doc = await db.tables.findOne(id).exec();

    if (!doc) {
      return null;
    }

    const nextTableNumber = patch.tableNumber ?? doc.tableNumber;
    const nextFloorId =
      patch.floorId === undefined ? doc.floorId : (patch.floorId ?? null);
    const nextName = patch.name?.trim();

    if (nextTableNumber !== doc.tableNumber) {
      await ensureUniqueTableNumber(doc.branchId, nextTableNumber, id);
    }

    await ensureValidFloorAssignment(doc.branchId, nextFloorId);

    await doc.patch({
      ...patch,
      ...(nextName ? { name: nextName } : {}),
      ...(patch.floorId !== undefined ? { floorId: nextFloorId } : {}),
      updatedAt: _.now().toLocaleString(),
      isSynced: false,
    });

    return doc;
  },

  async updateStatus(
    id: string,
    status: TableStatus,
  ): Promise<TableRxDoc | null> {
    const db = await getDatabase();
    const doc = await db.tables.findOne(id).exec();

    if (!doc || doc.isDeleted) {
      return null;
    }

    if (!doc.isActive) {
      throw new Error("Cannot change status of an inactive table");
    }

    if (status === TableStatus.AVAILABLE) {
      const activeOrders = await listActiveLocalOrdersByTableIds([id]);
      if (activeOrders.length > 0) {
        throw new Error(
          "Cannot release table with active orders. Complete or cancel all orders first.",
        );
      }
    }

    await doc.patch({
      status,
      updatedAt: _.now().toLocaleString(),
      isSynced: false,
    });

    return doc;
  },

  async ensureDeletable(id: string): Promise<TableDocument | null> {
    const context = await getTableDeleteContext(id);
    return context ? (context.doc.toJSON() as TableDocument) : null;
  },

  async delete(id: string): Promise<void> {
    const context = await getTableDeleteContext(id);
    if (!context) {
      return;
    }

    await clearLocalOrderTableAssignments([id]);
    await context.doc.remove();
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
