import { useState } from "react";
import { ProductDocument } from "@/db/types";
import { SelectedModifier } from "@/types/modifiers";
import { Button, cn, Empty, Icon } from "@repo/ui";
import { useModalStore } from "@/store/modalStore";
import { useLocalModifiers } from "@/hooks/offline/useLocalModifiers";
import type { ModifierGroup } from "@repo/types";

type Props = {
  product: ProductDocument;
  tenantId: string;
  initialModifiers?: SelectedModifier[];
  initialQuantity?: number;
  onConfirm: (modifiers: SelectedModifier[], quantity: number) => void;
};

export const OfflineModifierModal = ({
  product,
  tenantId,
  initialModifiers = [],
  initialQuantity = 1,
  onConfirm,
}: Props) => {
  const { closeModal } = useModalStore();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialModifiers.map((m) => m.modifierId)),
  );

  const { groups: modifierGroups, isLoading } = useLocalModifiers(
    product.id,
    tenantId,
    true,
  );

  const handleToggleModifier = (modifierId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(modifierId)) {
      newSelected.delete(modifierId);
    } else {
      newSelected.add(modifierId);
    }
    setSelected(newSelected);
  };

  const handleConfirm = () => {
    const selectedModifiers: SelectedModifier[] = [];
    for (const group of modifierGroups) {
      for (const mod of group.modifiers) {
        if (selected.has(mod.id)) {
          selectedModifiers.push({
            modifierId: mod.id,
            name: mod.name,
            price: Number(mod.price) || 0,
          });
        }
      }
    }
    onConfirm(selectedModifiers, quantity);
    closeModal();
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, quantity + delta);
    setQuantity(newQty);
  };

  const basePrice = Number(product.price) || 0;
  let totalModifierPrice = 0;
  for (const group of modifierGroups) {
    for (const mod of group.modifiers) {
      if (selected.has(mod.id)) {
        totalModifierPrice += Number(mod.price) || 0;
      }
    }
  }
  const unitPriceWithModifiers = basePrice + totalModifierPrice;
  const totalPrice = unitPriceWithModifiers * quantity;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading modifiers...</div>
          </div>
        ) : modifierGroups.length === 0 ? (
          <Empty
            title="No Modifiers"
            description="There are no modifiers available for this product."
          />
        ) : (
          <div className="space-y-6">
            {modifierGroups.map((group) => (
              <ModifierGroup
                key={group.id}
                group={group}
                selected={selected}
                onToggle={handleToggleModifier}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-6 bg-background">
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

        {/* Pricing Summary */}
        <div className="space-y-2 mb-6 pb-6 border-b">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base Price</span>
            <span className="font-medium">
              ${basePrice.toFixed(2)} × {quantity}
            </span>
          </div>
          {totalModifierPrice > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Modifiers</span>
              <span className="font-medium text-amber-600">
                +${(totalModifierPrice * quantity).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2">
            <span>Total</span>
            <span className="text-primary">${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => closeModal()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button variant="default" onClick={handleConfirm} className="flex-1">
            Add to Order
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ModifierGroupProps {
  group: ModifierGroup;
  selected: Set<string>;
  onToggle: (modifierId: string) => void;
}

function ModifierGroup({ group, selected, onToggle }: ModifierGroupProps) {
  return (
    <div>
      <h3 className="font-semibold text-base mb-3">{group.name}</h3>
      <div className="space-y-2">
        {group.modifiers.map((modifier) => {
          return (
            <button
              key={modifier.id}
              onClick={() => onToggle(modifier.id)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg border transition",
                selected.has(modifier.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 bg-background",
              )}
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                <div
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition",
                    selected.has(modifier.id)
                      ? "bg-primary border-primary"
                      : "border-border bg-background",
                  )}
                >
                  {selected.has(modifier.id) && (
                    <Icon
                      name="Check"
                      className="w-3 h-3 text-primary-foreground"
                    />
                  )}
                </div>
                <span className="font-medium text-sm">{modifier.name}</span>
              </div>
              {Number(modifier.price) > 0 && (
                <span className="text-sm font-semibold text-amber-600 ml-2">
                  +${Number(modifier.price).toFixed(2)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
