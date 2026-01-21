import {
  ModifierGroup,
  ModifierValidationError,
  ModifierValidationResult,
  SelectedModifier,
} from "@/types/modifiers";

/**
 * ========================================
 * MODIFIER VALIDATION
 * ========================================
 */
export const validateModifierSelections = (
  groups: ModifierGroup | undefined,
  selections: Record<string, Set<string>>,
): ModifierValidationResult => {
  const errors: ModifierValidationError[] = [];

  if (
    !groups ||
    !groups.modifierGroups ||
    !Array.isArray(groups.modifierGroups)
  ) {
    return {
      isValid: true,
      errors: [],
    };
  }

  for (const group of groups.modifierGroups) {
    const selected = selections[group.id] || new Set();
    const count = selected.size;

    if (group.type === "SINGLE") {
      if (count === 0) {
        errors.push({
          groupId: group.id,
          groupName: group.name,
          message: `Please select one option from "${group.name}"`,
        });
      } else if (count > 1) {
        errors.push({
          groupId: group.id,
          groupName: group.name,
          message: `Only one option allowed in "${group.name}"`,
        });
      }
    }
    // MULTIPLE type has no validation errors - 0 or more allowed
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * ========================================
 * PRICING CALCULATIONS
 * ========================================
 */

/**
 * Calculate total modifier price from selections
 */
export const calculateModifierTotal = (
  groups: ModifierGroup | undefined,
  selections: Record<string, Set<string>>,
): number => {
  if (
    !groups ||
    !groups.modifierGroups ||
    !Array.isArray(groups.modifierGroups)
  ) {
    return 0;
  }

  let total = 0;

  for (const group of groups.modifierGroups) {
    const selectedIds = selections[group.id] || new Set();

    for (const modifierId of selectedIds) {
      const modifier = group.modifiers.find((m) => m.id === modifierId);
      if (modifier) {
        total += modifier.price;
      }
    }
  }

  return total;
};

/**
 * Calculate item subtotal with modifiers
 * @param basePrice - Product base price
 * @param modifierTotal - Total price of selected modifiers
 * @param quantity - Item quantity
 */
export const calculateItemSubtotal = (
  basePrice: number,
  modifierTotal: number,
  quantity: number,
): number => {
  return (basePrice + modifierTotal) * quantity;
};

/**
 * ========================================
 * MODIFIER SELECTION HELPERS
 * ========================================
 */

export const getSelectedModifiersArray = (
  groups: ModifierGroup | undefined,
  selections: Record<string, Set<string>>,
): SelectedModifier[] => {
  const result: SelectedModifier[] = [];

  if (
    !groups ||
    !groups.modifierGroups ||
    !Array.isArray(groups.modifierGroups)
  ) {
    return [];
  }

  for (const group of groups.modifierGroups) {
    const selectedIds = selections[group.id] || new Set();

    for (const modifierId of selectedIds) {
      const modifier = group.modifiers.find((m) => m.id === modifierId);
      if (modifier) {
        result.push({
          modifierId: modifier.id,
          name: modifier.name,
          price: modifier.price,
        });
      }
    }
  }

  return result;
};

/**
 * Get just the modifier IDs for backend payload
 */
export const getSelectedModifierIds = (
  selections: Record<string, Set<string>>,
): string[] => {
  const ids: string[] = [];

  for (const selectedIds of Object.values(selections)) {
    ids.push(...Array.from(selectedIds));
  }

  return ids;
};

/**
 * ========================================
 * CART ITEM COMPARISON
 * ========================================
 */

/**
 * Check if two modifier sets are identical
 * Used to determine if items should be merged in cart
 */
export const areModifiersEqual = (
  modifiers1: SelectedModifier[],
  modifiers2: SelectedModifier[],
): boolean => {
  if (modifiers1.length !== modifiers2.length) {
    return false;
  }

  const ids1 = new Set(modifiers1.map((m) => m.modifierId));
  const ids2 = new Set(modifiers2.map((m) => m.modifierId));

  if (ids1.size !== ids2.size) {
    return false;
  }

  for (const id of ids1) {
    if (!ids2.has(id)) {
      return false;
    }
  }

  return true;
};

/**
 * Generate unique key for cart item with modifiers
 * Same product with different modifiers = different cart lines
 */
export const generateCartItemKey = (
  productId: string,
  modifierIds: string[],
): string => {
  const sortedIds = [...modifierIds].sort();
  return `${productId}-${sortedIds.join(",")}`;
};

/**
 * ========================================
 * MODIFIER DISPLAY HELPERS
 * ========================================
 */

/**
 * Format modifier names for display
 * Example: "Extra Cheese, No Onions"
 */
export const formatModifierNames = (modifiers: SelectedModifier[]): string => {
  if (modifiers.length === 0) return "";
  return modifiers.map((m) => m.name).join(", ");
};

/**
 * Format modifier prices for display
 * Example: "+$2.50"
 */
export const formatModifierPrice = (price: number): string => {
  if (price === 0) return "";
  return price > 0
    ? `+$${price.toFixed(2)}`
    : `-$${Math.abs(price).toFixed(2)}`;
};
