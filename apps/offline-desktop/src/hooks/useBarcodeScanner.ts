import { useEffect, useRef } from "react";

// USB barcode scanners type characters rapidly and finish with Enter.
// Buffer fast keystrokes; when Enter arrives and the buffer looks like a
// scan (fast + length >= 4), emit it. Ignores input typed into fields.

const SCAN_MAX_KEY_INTERVAL_MS = 50;
const SCAN_MIN_LENGTH = 4;

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const lastKeyAtRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTyping) return;

      const now = Date.now();
      if (now - lastKeyAtRef.current > SCAN_MAX_KEY_INTERVAL_MS) {
        bufferRef.current = "";
      }
      lastKeyAtRef.current = now;

      if (event.key === "Enter") {
        if (bufferRef.current.length >= SCAN_MIN_LENGTH) {
          onScan(bufferRef.current);
        }
        bufferRef.current = "";
        return;
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
}
