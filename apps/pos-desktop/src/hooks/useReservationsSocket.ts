import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "@repo/ui";

/** Delay before refetching after a burst of socket events. */
const INVALIDATE_DEBOUNCE_MS = 300;

type ReservationEvent = {
  event: string;
  reservationId?: string;
  auto?: boolean;
};

/**
 * Live reservation updates. Connects to the same `/kitchen` namespace and
 * `branch_{id}` room the KDS/tables use, and listens for `reservationsUpdated`
 * (forwarded by the backend for every reservation lifecycle event). Refetches
 * the reservation lists (debounced) and surfaces a toast for the guest-facing
 * signals (arriving soon, no-show).
 */
export const useReservationsSocket = (branchId: string | null) => {
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

    const invalidateSoon = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["reservations"] });
      }, INVALIDATE_DEBOUNCE_MS);
    };

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("joinBranch", branchId);
      invalidateSoon();
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("reservationsUpdated", (payload: ReservationEvent) => {
      invalidateSoon();

      // Surface the guest-facing signals; routine CRUD stays quiet (the acting
      // user already got a toast from their mutation).
      if (payload.event === "reservation.arriving_soon") {
        toast.info("A guest is arriving in ~30 minutes");
      } else if (payload.event === "reservation.no_show" && payload.auto) {
        toast.warning("A reservation was auto-marked as no-show");
      }
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
