import { useProductModifiers } from "@/hooks/useModifiers";
import { useModifierSelection } from "@/hooks/useModifierSelection";
import { useBaseCurrency } from "@/hooks/useCurrency";
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
  const { format: formatMoney } = useBaseCurrency();
  const [quantity, setQuantity] = useState(initialQuantity);

  const { data: groups, isLoading } = useProductModifiers(product.id);

  const { selectedModifiers, totalModifierPrice, toggleModifier, isSelected } =
    useModifierSelection({
      groups,
      initialModifiers,
    });

  const handleConfirm = () => {
    onConfirm(selectedModifiers, quantity);
    closeModal();
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, quantity + delta);
    setQuantity(newQty);
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
      <div className="border-t p-6 bg-background">
        {/* Quantity Selector */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">
            Quantity
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              <Icon name="Minus" className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold w-12 text-center">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(1)}
            >
              <Icon name="Plus" className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Base Price</span>
            <span>{formatMoney(basePrice)}</span>
          </div>
          {totalModifierPrice > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Modifiers</span>
              <span>+{formatMoney(totalModifierPrice)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">{formatMoney(totalPrice)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={closeModal}
            size="lg"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            size="lg"
            disabled={
              !groups ||
              !groups.modifierGroups ||
              groups.modifierGroups.length === 0
            }
          >
            Add to Cart
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
  const { format: formatMoney } = useBaseCurrency();

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
              ? `+ ${formatMoney(modifier.price)}`
              : modifier.price < 0
                ? `- ${formatMoney(Math.abs(modifier.price))}`
                : "";

          return (
            <Button
              key={modifier.id}
              onClick={() => toggleModifier(group.id, modifier.id, group.type)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                "border border-border hover:border-primary/50 hover:text-white",
                checked
                  ? "bg-primary text-white border-primary"
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
            </Button>
          );
        })}
      </div>
    </div>
  );
};
