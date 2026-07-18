import { ModifierType } from "@repo/types";

/**
 * ========================================
 * MODIFIER TYPES (FRONTEND)
 * ========================================
 */

export interface Modifier {
  id: string;
  name: string;
  price: number;
  groupId: string;
  productAssignments?: {
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
    };
  }[];
}

export interface ModifierGroupItem {
  id: string;
  name: string;
  type: ModifierType;
  modifiers: Modifier[];
}

export interface ModifierGroup {
  productId: string;
  modifierGroups: ModifierGroupItem[];
}

export interface SelectedModifier {
  modifierId: string;
  name: string;
  price: number;
}

export interface CartItemModifier {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
  modifiers: SelectedModifier[];
  discount?: {
    value: number;
    type: "PERCENTAGE" | "FIXED";
  };
}

export interface ModifierValidationError {
  groupId: string;
  groupName: string;
  message: string;
}

export interface ModifierValidationResult {
  isValid: boolean;
  errors: ModifierValidationError[];
}
export interface ModifierSelectionState {
  // Map: groupId -> selected modifier IDs
  selections: Record<string, Set<string>>;
}

export interface OrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  modifiers: string[];
}

export interface OrderItemWithModifiers {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  total: number;
  modifiers: {
    modifierId: string;
    price: number;
  }[];
}
