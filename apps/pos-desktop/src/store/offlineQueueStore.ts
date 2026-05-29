import { create } from "zustand";
import type { CreateOrderDto } from "@/dto/order.dto";
import type { OrderStatus, PaymentMethod } from "@repo/types";

export type QueuedOpStatus = "PENDING" | "SYNCING" | "FAILED";

export type PaymentDto = {
  amount: number;
  method: PaymentMethod;
  currencyCode: string;
  exchangeRate: number;
};

export type QueuedOperation =
  | {
      type: "CREATE_AND_PAY";
      payload: {
        orderDto: CreateOrderDto;
        payments: PaymentDto[];
        loyalty?: { redeemPoints: number };
      };
      localId: string;
      timestamp: number;
      retries: number;
      status: QueuedOpStatus;
      label: string;
    }
  | {
      type: "CREATE_AND_CONFIRM";
      payload: { orderDto: CreateOrderDto };
      localId: string;
      timestamp: number;
      retries: number;
      status: QueuedOpStatus;
      label: string;
    }
  | {
      type: "UPDATE_ORDER_STATUS";
      payload: { orderId: string; status: OrderStatus };
      localId: string;
      timestamp: number;
      retries: number;
      status: QueuedOpStatus;
      label: string;
    }
  | {
      type: "UPDATE_AND_PAY";
      payload: {
        orderId: string;
        newItems?: any[];
        payments: PaymentDto[];
        loyalty?: { redeemPoints: number };
      };
      localId: string;
      timestamp: number;
      retries: number;
      status: QueuedOpStatus;
      label: string;
    };

type OfflineQueueState = {
  queue: QueuedOperation[];
  isSyncing: boolean;

  enqueue: (
    op: Omit<QueuedOperation, "timestamp" | "retries" | "status">,
  ) => void;

  dequeue: (localId: string) => void;

  markSyncing: (syncing: boolean) => void;

  incrementRetry: (localId: string) => void;

  markFailed: (localId: string) => void;

  setStatus: (localId: string, status: QueuedOpStatus) => void;

  pendingCount: () => number;

  failedCount: () => number;

  clearFailed: () => void;
};

export const MAX_RETRIES = 3;

export const useOfflineQueueStore = create<OfflineQueueState>()((set, get) => ({
  queue: [],
  isSyncing: false,

  enqueue: async (op) => {
    const newOp: QueuedOperation = {
      ...op,
      timestamp: Date.now(),
      retries: 0,
      status: "PENDING",
    } as QueuedOperation;

    set((state) => ({ queue: [...state.queue, newOp] }));
    if (window.api?.sync) {
      await window.api.sync.enqueue({
        ...newOp,
        payload: JSON.stringify(newOp.payload),
      });
    }
  },

  dequeue: async (localId) => {
    set((state) => ({
      queue: state.queue.filter((op) => op.localId !== localId),
    }));
    if (window.api?.sync) {
      await window.api.sync.dequeue(localId);
    }
  },

  markSyncing: (syncing) => set({ isSyncing: syncing }),

  incrementRetry: async (localId) => {
    set((state) => ({
      queue: state.queue.map((op) =>
        op.localId === localId ? { ...op, retries: op.retries + 1 } : op,
      ),
    }));
    if (window.api?.sync) {
      await window.api.sync.incrementRetry(localId);
    }
  },

  markFailed: async (localId) => {
    set((state) => ({
      queue: state.queue.map((op) =>
        op.localId === localId ? { ...op, status: "FAILED" } : op,
      ),
    }));
    if (window.api?.sync) {
      await window.api.sync.markFailed(localId);
    }
  },

  setStatus: async (localId, status) => {
    set((state) => ({
      queue: state.queue.map((op) =>
        op.localId === localId ? { ...op, status } : op,
      ),
    }));
    if (window.api?.sync) {
      await window.api.sync.setStatus(localId, status);
    }
  },

  pendingCount: () => {
    const { queue } = get();
    return queue.filter(
      (op) => op.status === "PENDING" || op.status === "SYNCING",
    ).length;
  },

  failedCount: () => {
    const { queue } = get();
    return queue.filter((op) => op.status === "FAILED").length;
  },

  clearFailed: async () => {
    set((state) => ({
      queue: state.queue.filter((op) => op.status !== "FAILED"),
    }));
    if (window.api?.sync) {
      await window.api.sync.clearFailed();
    }
  },
}));

// Initialize queue from SQLite on load
if (typeof window !== "undefined" && window.api?.sync) {
  window.api.sync.getAll().then((rows) => {
    const parsedQueue = rows.map((row) => ({
      ...row,
      payload: JSON.parse(row.payload),
    }));
    useOfflineQueueStore.setState({ queue: parsedQueue });
  });
}
