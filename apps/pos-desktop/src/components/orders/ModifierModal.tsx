import { useProductModifiers } from "@/hooks/useModifiers";
import { useModifierSelection } from "@/hooks/useModifierSelection";
import { useModalStore } from "@/store/modalStore";
import {
  ModifierGroup as ModifierGroupType,
  SelectedModifier,
} from "@/types/modifiers";
import { Product } from "@repo/types";
import { Button, cn, Empty, Icon } from "@repo/ui";
import { useState } from "react";

type Props = {
  product: Product;
  initialModifiers?: SelectedModifier[]; // For edit mode
  initialQuantity?: number;
  onConfirm: (modifiers: SelectedModifier[], quantity: number) => void;
};

export const ModifierModal = ({
  product,
  initialModifiers = [],
  initialQuantity = 1,
  onConfirm,
}: Props) => {
  const { closeModal } = useModalStore();
  const [quantity, setQuantity] = useState(initialQuantity);

  // Fetch modifiers for this product
  const { data: groups, isLoading } = useProductModifiers(product.id);

  // Modifier selection logic
  const { selectedModifiers, totalModifierPrice, toggleModifier, isSelected } =
    useModifierSelection({
      groups,
      initialModifiers,
    });

  const handleConfirm = () => {
    onConfirm(selectedModifiers, quantity);
    closeModal();
  };

  // Calculate pricing
  const basePrice = Number(product.price) || 0;
  const unitPriceWithModifiers = basePrice + totalModifierPrice;
  const totalPrice = unitPriceWithModifiers * quantity;

  return (
    <div className="flex flex-col h-full">
      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading modifiers...</div>
          </div>
        ) : !groups ||
          !groups.modifierGroups ||
          groups.modifierGroups.length === 0 ? (
          <Empty
            title="No Modifiers"
            description="There are no modifiers available for this product."
          />
        ) : (
          <div className="space-y-6">
            {groups.modifierGroups.map((group) => (
              <ModifierGroup
                key={group.id}
                group={group}
                isSelected={isSelected}
                toggleModifier={toggleModifier}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - Fixed */}
      <div className="p-6 border-t bg-background">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={closeModal}
            size="lg"
          >
            Discard
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={handleConfirm}
            size="lg"
            disabled={
              !groups ||
              !groups.modifierGroups ||
              groups.modifierGroups.length === 0
            }
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * ========================================
 * MODIFIER GROUP COMPONENT
 * ========================================
 */

interface ModifierGroupProps {
  group: ModifierGroupType["modifierGroups"][0];
  isSelected: (groupId: string, modifierId: string) => boolean;
  toggleModifier: (
    groupId: string,
    modifierId: string,
    type: "SINGLE" | "MULTIPLE",
  ) => void;
}

export const ModifierGroup = ({
  group,
  isSelected,
  toggleModifier,
}: ModifierGroupProps) => {
  return (
    <div className="space-y-3">
      {/* Group Title */}
      <h3 className="text-base font-medium text-foreground">{group.name}</h3>

      {/* Modifiers as Chips */}
      <div className="flex flex-wrap gap-2">
        {group.modifiers.map((modifier) => {
          const checked = isSelected(group.id, modifier.id);
          const priceText =
            modifier.price > 0
              ? `+ ${modifier.price.toFixed(2)}$`
              : modifier.price < 0
                ? `- ${Math.abs(modifier.price).toFixed(2)}$`
                : "";

          return (
            <button
              key={modifier.id}
              onClick={() => toggleModifier(group.id, modifier.id, group.type)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                "border border-border hover:border-primary/50",
                checked
                  ? "bg-[#17a2b8] text-white border-[#17a2b8]"
                  : "bg-background text-foreground",
              )}
            >
              <span>{modifier.name}</span>
              {priceText && (
                <span
                  className={checked ? "opacity-90" : "text-muted-foreground"}
                >
                  {priceText}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
