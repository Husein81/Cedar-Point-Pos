import _ from "lodash";
import { OrderStatus } from "@repo/types";
import { getDatabase } from "../database";
import type { OrderDocument } from "../types";

export function generateLocalId(): string {
  let id = "c";

  for (let i = 0; i < 26; i++) {
    id += Math.floor(Math.random() * 36).toString(36);
  }
  return id;
}

const ACTIVE_LOCAL_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.DRAFT,
  OrderStatus.ON_HOLD,
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.SENT_TO_KITCHEN,
  OrderStatus.READY,
]);

export async function listActiveLocalOrdersByTableIds(
  tableIds: string[],
): Promise<OrderDocument[]> {
  if (!tableIds.length) {
    return [];
  }

  const db = await getDatabase();
  const docs = await db.orders.find().exec();

  return docs
    .map((doc) => doc.toJSON() as OrderDocument)
    .filter(
      (order) =>
        !!order.tableId &&
        tableIds.includes(order.tableId) &&
        ACTIVE_LOCAL_ORDER_STATUSES.has(order.status),
    );
}

export async function clearLocalOrderTableAssignments(
  tableIds: string[],
): Promise<void> {
  if (!tableIds.length) {
    return;
  }

  const db = await getDatabase();
  const docs = await db.orders.find().exec();
  const ts = _.now().toLocaleString();

  const matchingDocs = docs.filter(
    (doc) => !!doc.tableId && tableIds.includes(doc.tableId),
  );

  await Promise.all(
    matchingDocs.map((doc) =>
      doc.patch({
        tableId: null,
        updatedAt: ts,
        isSynced: false,
      }),
    ),
  );
}

export async function ensureUniqueFloorName(
  branchId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const db = await getDatabase();
  const existingFloors = await db.floors
    .find({
      selector: {
        branchId: { $eq: branchId },
        name: { $eq: name },
        isDeleted: { $eq: false },
      },
    })
    .exec();

  if (existingFloors.some((floor) => floor.id !== excludeId)) {
    throw new Error(`Floor "${name}" already exists in this branch`);
  }
}

export async function ensureUniqueTableNumber(
  branchId: string,
  tableNumber: number,
  excludeId?: string,
): Promise<void> {
  const db = await getDatabase();
  const existingTables = await db.tables
    .find({
      selector: {
        branchId: { $eq: branchId },
        tableNumber: { $eq: tableNumber },
        isDeleted: { $eq: false },
      },
    })
    .exec();

  if (existingTables.some((table) => table.id !== excludeId)) {
    throw new Error(
      `Table number ${tableNumber} already exists in this branch`,
    );
  }
}

export async function ensureValidFloorAssignment(
  branchId: string,
  floorId?: string | null,
): Promise<void> {
  if (!floorId) {
    return;
  }

  const db = await getDatabase();
  const floor = await db.floors.findOne(floorId).exec();

  if (!floor || floor.isDeleted || floor.branchId !== branchId) {
    throw new Error("Floor not found or does not belong to this branch");
  }
}
