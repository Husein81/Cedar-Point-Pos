import { useEffect, useRef } from "react";
import { useNetworkStatus } from "../context/NetworkContext";
import {
  useOfflineQueueStore,
  MAX_RETRIES,
  type QueuedOperation,
} from "../store/offlineQueueStore";
import { ordersApi } from "../apis/ordersApi";
import { tablesApi } from "../apis/tablesApi";
import { toast } from "@repo/ui";
import { useModalStore } from "../store/modalStore";
import { Button } from "@repo/ui";
import { extractErrorMessage } from "../utils/error";

async function promptConflict(label: string): Promise<"PROCEED" | "DISCARD"> {
  const { openModal, closeModal } = useModalStore();

  return new Promise((resolve) => {
    openModal(
      "Sync Conflict Detected",
      <div className="flex flex-col gap-4 px-2">
        <p className="text-sm text-muted-foreground">
          The offline order{" "}
          <span className="font-semibold text-foreground">"{label}"</span> could
          not be synced because the server already has an active order for the
          same table.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => {
              closeModal();
              resolve("PROCEED");
            }}
          >
            Create as a separate order
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              closeModal();
              resolve("DISCARD");
            }}
          >
            Discard the offline order
          </Button>
        </div>
      </div>,
      "Another device may have taken an order for this table while you were offline.",
    );
  });
}

async function syncOperation(
  op: QueuedOperation,
): Promise<"SUCCESS" | "CONFLICT_DISCARD" | "ERROR"> {
  if (op.type === "CREATE_AND_PAY") {
    const { orderDto, payments, loyalty } = op.payload;
    const dtoToSend = { ...orderDto };

    // Check for table conflict
    if (dtoToSend.tableId) {
      try {
        const existing = await ordersApi.getActiveOrderByTableId(
          dtoToSend.tableId,
        );
        if (existing) {
          const choice = await promptConflict(op.label);
          if (choice === "DISCARD") return "CONFLICT_DISCARD";
          // PROCEED: strip tableId so we create a standalone order
          delete (dtoToSend as Record<string, unknown>).tableId;
        }
      } catch {
        // Non-fatal, proceed with original DTO
      }
    }

    const created = await ordersApi.createOrder(dtoToSend);
    await ordersApi.processPayment(created.id, {
      payments,
      ...(loyalty ? { loyalty } : {}),
    });
    return "SUCCESS";
  }

  if (op.type === "CREATE_AND_CONFIRM") {
    const dtoToSend = { ...op.payload.orderDto };

    if (dtoToSend.tableId) {
      try {
        const existing = await ordersApi.getActiveOrderByTableId(
          dtoToSend.tableId,
        );
        if (existing) {
          const choice = await promptConflict(op.label);
          if (choice === "DISCARD") return "CONFLICT_DISCARD";
          delete (dtoToSend as Record<string, unknown>).tableId;
        }
      } catch {
        // Non-fatal
      }
    }

    await ordersApi.createOrder(dtoToSend);
    return "SUCCESS";
  }

  if (op.type === "UPDATE_ORDER_STATUS") {
    // Note: if it's an offline order that hasn't synced yet, this might fail because the ID doesn't exist on server yet.
    // However, if the order was an offline order, we don't have its real ID yet.
    // We should only enqueue status updates for orders that already have real IDs (not starting with offline-).
    // Let's just pass it to the API and if it fails, it will fail and retry or be marked failed.
    await ordersApi.updateOrderStatus(op.payload.orderId, {
      status: op.payload.status,
    });
    return "SUCCESS";
  }

  if (op.type === "UPDATE_AND_PAY") {
    const { orderId, newItems, payments, loyalty } = op.payload;
    if (newItems && newItems.length > 0) {
      await ordersApi.batchAddItemsToOrder(orderId, newItems);
    }
    await ordersApi.processPayment(orderId, {
      payments,
      ...(loyalty ? { loyalty } : {}),
    });
    return "SUCCESS";
  }

  if (op.type === "UPDATE_TABLE_STATUS") {
    await tablesApi.updateTableStatus(op.payload.tableId, {
      status: op.payload.status,
    });
    return "SUCCESS";
  }

  return "ERROR";
}

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus();
  const { queue, dequeue, markSyncing, incrementRetry, markFailed, setStatus } =
    useOfflineQueueStore();

  const syncingRef = useRef(false);
  const prevOnlineRef = useRef(isOnline);

  useEffect(() => {
    prevOnlineRef.current = isOnline;

    const runSync = async () => {
      if (!isOnline || syncingRef.current) return;

      const currentQueue = useOfflineQueueStore.getState().queue;
      const pending = currentQueue.filter((op) => op.status === "PENDING");
      if (pending.length === 0) return;

      syncingRef.current = true;
      markSyncing(true);

      for (const op of pending) {
        setStatus(op.localId, "SYNCING");

        try {
          const result = await syncOperation(op);

          if (result === "SUCCESS") {
            dequeue(op.localId);
            toast.success(`Synced: ${op.label}`);
          } else if (result === "CONFLICT_DISCARD") {
            dequeue(op.localId);
            toast.info(`Offline order discarded: ${op.label}`);
          }
        } catch (error) {
          console.error("Sync operation failed for", op.label, ":", error);
          const errorMsg = extractErrorMessage(error, "Unknown error");
          incrementRetry(op.localId);

          const updatedOp = useOfflineQueueStore
            .getState()
            .queue.find((o) => o.localId === op.localId);
          const currentRetries = updatedOp ? updatedOp.retries : op.retries;

          if (currentRetries >= MAX_RETRIES) {
            markFailed(op.localId);
            toast.error(
              `Failed to sync "${op.label}" after ${MAX_RETRIES} attempts. Error: ${errorMsg}`,
              { duration: 10_000 },
            );
          } else {
            setStatus(op.localId, "PENDING");
            toast.error(`Sync attempt failed for "${op.label}": ${errorMsg}. Will retry.`);
            break;
          }
        }
      }

      markSyncing(false);
      syncingRef.current = false;
    };

    // Run sync immediately when queue length or online status changes
    runSync();

    // Set up standard 15-second retry interval for outstanding pending items
    const interval = setInterval(() => {
      runSync();
    }, 15_000);

    return () => clearInterval(interval);
  }, [isOnline, queue.length]);
}

export function OfflineSyncService() {
  useOfflineSync();
  return null;
}
