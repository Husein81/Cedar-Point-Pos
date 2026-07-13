import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/** Delay before refetching after a burst of socket events. */
const INVALIDATE_DEBOUNCE_MS = 300;

/**
 * Live floor-plan updates for the Table Management page.
 *
 * Connects to the same `/kitchen` namespace and `branch_{id}` room the KDS
 * uses, and listens for:
 *  - `tablesUpdated` — a table-affecting mutation happened (seat, pay,
 *    transfer, merge, status/layout change) → refetch tables.
 *  - `newOrder` / `orderUpdated` — order state drives the derived table
 *    badges (PREPARING/READY/BILLING) → refetch tables + orders.
 *
 * Invalidation is debounced so a burst of events (e.g. a merge emitting both
 * order and table events) causes a single refetch.
 */
export const useTablesSocket = (branchId: string | null) => {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!branchId) return;

    const apiUrl = import.meta.env.VITE_API_URL;
    const socketUrl = apiUrl.replace(/\/api$/, "");

    const socket = io(`${socketUrl}/kitchen`, {
      transports: ["websocket"],
      reconnection: true,
    });

    socketRef.current = socket;

    const invalidateSoon = (keys: string[][]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        for (const key of keys) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      }, INVALIDATE_DEBOUNCE_MS);
    };

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("joinBranch", branchId);
      // Catch up on anything missed while disconnected.
      invalidateSoon([["tables"]]);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("tablesUpdated", () => {
      invalidateSoon([["tables"]]);
    });

    socket.on("newOrder", () => {
      invalidateSoon([["tables"], ["orders"]]);
    });

    socket.on("orderUpdated", () => {
      invalidateSoon([["tables"], ["orders"]]);
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socket.emit("leaveBranch", branchId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [branchId, queryClient]);

  return { isConnected };
};
