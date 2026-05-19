import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useKitchenSocket = (branchId: string | null) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useEffect(() => {
    if (!branchId) return;

    const apiUrl = import.meta.env.VITE_API_URL;
    const socketUrl = apiUrl.replace(/\/api$/, "");

    const socket = io(`${socketUrl}/kitchen`, {
      transports: ["websocket"],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Kitchen socket connected");
      setIsConnected(true);
      socket.emit("joinBranch", branchId);
    });

    socket.on("disconnect", () => {
      console.log("Kitchen socket disconnected");
      setIsConnected(false);
    });

    socket.on("orderUpdated", (order) => {
      console.log("Kitchen order updated:", order);
      setLastUpdate({ type: "update", order });
    });

    socket.on("newOrder", (order) => {
      console.log("New kitchen order:", order);
      setLastUpdate({ type: "new", order });
    });

    return () => {
      if (socket) {
        socket.emit("leaveBranch", branchId);
        socket.disconnect();
      }
    };
  }, [branchId]);

  return { isConnected, lastUpdate };
};
