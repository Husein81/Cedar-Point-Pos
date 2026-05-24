import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CreateOrderDto } from "@/dto/order.dto";
import type { PaymentMethod } from "@repo/types";

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
      /** Human-readable description shown in the queue badge */
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

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,

      enqueue: (op) => {
        const newOp: QueuedOperation = {
          ...op,
          timestamp: Date.now(),
          retries: 0,
          status: "PENDING",
        } as QueuedOperation;

        set((state) => ({ queue: [...state.queue, newOp] }));
      },

      dequeue: (localId) => {
        set((state) => ({
          queue: state.queue.filter((op) => op.localId !== localId),
        }));
      },

      markSyncing: (syncing) => set({ isSyncing: syncing }),

      incrementRetry: (localId) => {
        set((state) => ({
          queue: state.queue.map((op) =>
            op.localId === localId ? { ...op, retries: op.retries + 1 } : op,
          ),
        }));
      },

      markFailed: (localId) => {
        set((state) => ({
          queue: state.queue.map((op) =>
            op.localId === localId ? { ...op, status: "FAILED" } : op,
          ),
        }));
      },

      setStatus: (localId, status) => {
        set((state) => ({
          queue: state.queue.map((op) =>
            op.localId === localId ? { ...op, status } : op,
          ),
        }));
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

      clearFailed: () => {
        set((state) => ({
          queue: state.queue.filter((op) => op.status !== "FAILED"),
        }));
      },
    }),
    {
      name: "pos-offline-queue",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
