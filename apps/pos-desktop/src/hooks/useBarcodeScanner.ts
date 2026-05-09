import { useEffect, useRef } from "react";
import { productsApi } from "@/apis/productsApi";
import { useOrderStore } from "@/store/orderStore";
import { toast } from "@repo/ui";

const SCANNER_DELAY = 100;

export const useBarcodeScanner = () => {
  const { addItem } = useOrderStore();

  const barcodeRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      const isInputTarget =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputTarget) return;

      const currentTime = Date.now();

      // Reset if typing too slow
      if (currentTime - lastKeyTimeRef.current > SCANNER_DELAY) {
        barcodeRef.current = "";
      }

      lastKeyTimeRef.current = currentTime;

      // Scan completed
      if (event.key === "Enter") {
        const barcode = barcodeRef.current.trim();
        barcodeRef.current = "";

        if (barcode.length <= 2) return;
        if (isProcessingRef.current) return;

        try {
          isProcessingRef.current = true;

          const product = await productsApi.getProductByBarcode(barcode);

          if (!product) {
            toast.error(`Barcode not found: ${barcode}`);
            return;
          }

          addItem({
            productId: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            quantity: 1,
            imageUrl: product.imageUrl,
          });

          toast.success(`Added ${product.name}`);
        } catch (error) {
          console.error("Barcode scan error:", error);
          toast.error("Failed to scan barcode");
        } finally {
          isProcessingRef.current = false;
        }

        return;
      }

      // Accept most scanner chars
      if (event.key.length === 1) {
        barcodeRef.current += event.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [addItem]);
};
