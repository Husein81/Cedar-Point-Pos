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
  productId?: string | null;
}

export interface ModifierGroupItem {
  id: string;
  name: string;
  type: ModifierType; // 'SINGLE' | 'MULTIPLE'
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

/**
 * ========================================
 * CART ITEM WITH MODIFIERS
 * ========================================
 */

export interface CartItemModifier {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
  modifiers: SelectedModifier[]; // Selected modifiers for this item
  discount?: {
    value: number;
    type: "PERCENTAGE" | "FIXED";
  };
}

/**
 * ========================================
 * MODIFIER VALIDATION
 * ========================================
 */

export interface ModifierValidationError {
  groupId: string;
  groupName: string;
  message: string;
}

export interface ModifierValidationResult {
  isValid: boolean;
  errors: ModifierValidationError[];
}

/**
 * ========================================
 * MODIFIER SELECTION STATE
 * ========================================
 */

export interface ModifierSelectionState {
  // Map: groupId -> selected modifier IDs
  selections: Record<string, Set<string>>;
}

/**
 * ========================================
 * ORDER PAYLOAD (BACKEND COMPATIBLE)
 * ========================================
 */

export interface OrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  modifiers: string[]; // Array of modifier IDs
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
