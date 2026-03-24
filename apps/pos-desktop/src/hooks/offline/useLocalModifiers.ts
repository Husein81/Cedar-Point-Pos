import { productService } from "@/db/service";
import { ModifierGroup } from "@repo/types";
import { useEffect, useState } from "react";

export function useLocalModifiers(
  productId?: string,
  tenantId?: string,
  enabled: boolean = true,
) {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !productId || !tenantId) return;

    const loadModifiers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.info(
          `[useLocalModifiers] Loading modifiers for product: ${productId}, tenant: ${tenantId}`,
        );

        // Fetch the product with embedded modifiers
        const product = await productService.findById(productId);
        if (!product) {
          console.warn(`[useLocalModifiers] Product ${productId} not found`);
          setGroups([]);
          return;
        }

        const productJson = product.toJSON();
        const modifierGroups = (productJson as any).modifierGroups ?? [];

        console.info(
          `[useLocalModifiers] Found ${modifierGroups.length} modifier groups for product ${productId}:`,
          modifierGroups,
        );

        // Convert to LocalModifierGroup format
        const localGroups: ModifierGroup[] = modifierGroups.map(
          (group: any) => ({
            id: group.id,
            name: group.name,
            type: group.type as "SINGLE" | "MULTIPLE",
            modifiers: (group.modifiers ?? []).map((mod: any) => ({
              id: mod.id,
              name: mod.name,
              price: mod.price,
              groupId: mod.groupId,
            })),
          }),
        );

        console.info(
          `[useLocalModifiers] Final modifier groups with modifiers for product: ${localGroups.length}`,
          localGroups,
        );

        setGroups(localGroups);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load modifiers"),
        );
        console.error("[useLocalModifiers] Error loading modifiers:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadModifiers();
  }, [productId, tenantId, enabled]);

  return {
    groups,
    isLoading,
    error,
  };
}
