import { useEffect, useState } from "react";

const TICK_MS = 30_000;

/**
 * A single shared "now" that ticks every 30s. Every elapsed-time label on the
 * floor derives from this one value, so 300+ tables don't each run their own
 * interval and the whole floor re-renders at most twice a minute.
 */
export const useElapsedNow = (): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return now;
};
