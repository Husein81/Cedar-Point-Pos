import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type NetworkContextValue = {
  isOnline: boolean;
  lastOnlineAt: number | null;
};

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  lastOnlineAt: null,
});

const API_PING_URL = `${import.meta.env.VITE_API_URL}/test`;

const POLL_INTERVAL_MS = 5_000;

async function checkServerReachable(): Promise<boolean> {
  try {
    const res = await axios.get(API_PING_URL, {
      timeout: 4000,
    });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);

  const onlineRef = useRef(true);

  const update = useCallback((online: boolean) => {
    if (online !== onlineRef.current) {
      onlineRef.current = online;
      setIsOnline(online);
    }
    if (online) {
      setLastOnlineAt(Date.now());
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      if (!mounted) return;

      if (!navigator.onLine) {
        update(false);
      } else {
        const reachable = await checkServerReachable();
        if (mounted) update(reachable);
      }

      if (mounted) {
        timer = setTimeout(check, POLL_INTERVAL_MS);
      }
    };

    const handleOnline = () => check();
    const handleOffline = () => update(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    check();

    return () => {
      mounted = false;
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [update]);

  return (
    <NetworkContext value={{ isOnline, lastOnlineAt }}>
      {children}
    </NetworkContext>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkContext);
}
