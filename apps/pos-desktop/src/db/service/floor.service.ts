import _ from "lodash";
import { getDatabase } from "../database";
import type { FloorDocument, FloorRxDoc } from "../types";
import {
  clearLocalOrderTableAssignments,
  ensureUniqueFloorName,
  generateLocalId,
  listActiveLocalOrdersByTableIds,
} from "./local-data.service";

export interface FloorFilter {
  branchId?: string;
}

async function getFloorDeleteContext(id: string) {
  const db = await getDatabase();
  const floor = await db.floors.findOne(id).exec();

  if (!floor) {
    return null;
  }

  const tables = await db.tables
    .find({
      selector: {
        floorId: { $eq: id },
      },
    })
    .exec();

  const activeOrders = await listActiveLocalOrdersByTableIds(
    tables.map((table) => table.id),
  );

  if (activeOrders.length > 0) {
    const blockedTables = tables
      .filter((table) =>
        activeOrders.some((order) => order.tableId === table.id),
      )
      .map((table) => `"${table.name}"`)
      .join(", ");

    throw new Error(
      `Cannot delete floor "${floor.name}": tables [${blockedTables}] have active orders. Please complete or cancel orders first.`,
    );
  }

  return { floor, tables };
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

    return db.floors.find({
      selector,
      sort: [{ order: "asc" }, { name: "asc" }],
    }).$;
  },

  async findById(id: string): Promise<FloorRxDoc | null> {
    const db = await getDatabase();
    return db.floors.findOne(id).exec();
  },

  async create(
    data: Omit<
      FloorDocument,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "isSynced"
      | "isLocalOnly"
      | "isDeleted"
    >,
  ): Promise<FloorDocument> {
    await ensureUniqueFloorName(data.branchId, data.name);

    const db = await getDatabase();
    const ts = _.now().toLocaleString();
    const doc: FloorDocument = {
      id: generateLocalId(),
      ...data,
      isDeleted: false,
      createdAt: ts,
      updatedAt: ts,
      isSynced: false,
      isLocalOnly: true,
    };

    await db.floors.insert(doc);
    return doc;
  },

  async update(
    id: string,
    patch: Partial<
      Omit<FloorDocument, "id" | "createdAt" | "isSynced" | "isLocalOnly">
    >,
  ): Promise<FloorRxDoc | null> {
    const db = await getDatabase();
    const doc = await db.floors.findOne(id).exec();

    if (!doc) {
      return null;
    }

    const nextName = patch.name?.trim();
    if (nextName && nextName !== doc.name) {
      await ensureUniqueFloorName(doc.branchId, nextName, id);
    }

    await doc.patch({
      ...patch,
      ...(nextName ? { name: nextName } : {}),
      updatedAt: _.now().toLocaleString(),
      isSynced: false,
    });

    return doc;
  },

  async ensureDeletable(id: string): Promise<FloorDocument | null> {
    const context = await getFloorDeleteContext(id);
    return context ? (context.floor.toJSON() as FloorDocument) : null;
  },

  async delete(id: string): Promise<void> {
    const context = await getFloorDeleteContext(id);
    if (!context) {
      return;
    }

    const tableIds = context.tables.map((table) => table.id);
    await clearLocalOrderTableAssignments(tableIds);

    await Promise.all(context.tables.map((table) => table.remove()));
    await context.floor.remove();
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
