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

async function pingServer(): Promise<boolean> {
  try {
    const response = await axios.get(API_PING_URL, {
      timeout: POLL_INTERVAL_MS,
    });

    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

async function checkNetwork(): Promise<boolean> {
  const networkApi = window.api?.net;

  if (!networkApi?.checkStatus) {
    return true;
  }

  try {
    const { hasInterface, lookupSuccess } = await networkApi.checkStatus();

    return hasInterface && lookupSuccess;
  } catch (error) {
    console.error("Electron network check failed:", error);
    return false;
  }
}

export async function checkNetworkStatus(): Promise<boolean> {
  const hasNetwork = await checkNetwork();

  if (!hasNetwork) {
    return false;
  }

  return pingServer();
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
        const reachable = await checkNetwork();
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
