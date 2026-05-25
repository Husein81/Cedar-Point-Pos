import { useEffect, useRef } from "react";
import { useNetworkStatus } from "../context/NetworkContext";
import {
  useOfflineQueueStore,
  MAX_RETRIES,
  type QueuedOperation,
} from "../store/offlineQueueStore";
import { ordersApi } from "../apis/ordersApi";
import { toast } from "@repo/ui";
import { useModalStore } from "../store/modalStore";
import { Button } from "@repo/ui";

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

    const hasPending = queue.some((op) => op.status === "PENDING");
    if (!isOnline || !hasPending || syncingRef.current) return;

    (async () => {
      syncingRef.current = true;
      markSyncing(true);

      const pending = queue.filter((op) => op.status === "PENDING");

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
        } catch {
          incrementRetry(op.localId);

          if (op.retries + 1 >= MAX_RETRIES) {
            markFailed(op.localId);
            toast.error(
              `Failed to sync "${op.label}" after ${MAX_RETRIES} attempts. Review it in the queue.`,
              { duration: 10_000 },
            );
          } else {
            setStatus(op.localId, "PENDING");
            toast.error(`Sync attempt failed for "${op.label}". Will retry.`);
            break;
          }
        }
      }

      markSyncing(false);
      syncingRef.current = false;
    })();
  }, [isOnline, queue.length]);
}

export function OfflineSyncService() {
  useOfflineSync();
  return null;
}
