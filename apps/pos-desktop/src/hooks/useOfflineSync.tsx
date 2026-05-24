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

async function promptConflict(
  openModal: (
    title: string,
    content: React.ReactNode,
    subtitle?: string,
  ) => void,
  closeModal: () => void,
  label: string,
): Promise<"PROCEED" | "DISCARD"> {
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
  openModal: (
    title: string,
    content: React.ReactNode,
    subtitle?: string,
  ) => void,
  closeModal: () => void,
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
          const choice = await promptConflict(openModal, closeModal, op.label);
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
          const choice = await promptConflict(openModal, closeModal, op.label);
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

  return "ERROR";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus();
  const { openModal, closeModal } = useModalStore();
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
          const result = await syncOperation(op, openModal, closeModal);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, queue.length]);
}

// ─── Mount component ──────────────────────────────────────────────────────────

export function OfflineSyncService() {
  useOfflineSync();
  return null;
}
