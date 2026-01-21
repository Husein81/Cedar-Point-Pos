import { AdjustmentType } from "@/dto/inventory.dto";
export interface StockValidation {
  valid: boolean;
  message?: string;
  severity: "error" | "warning" | "info";
}

export const validateStockAdjustment = (
  adjustmentType: AdjustmentType,
  quantity: number,
  currentStock: number,
  minStock?: number,
): StockValidation => {
  // Validate quantity is positive
  if (quantity <= 0) {
    return {
      valid: false,
      message: "Quantity must be greater than zero",
      severity: "error",
    };
  }

  // STOCK_OUT validation
  if (adjustmentType === "STOCK_OUT") {
    if (quantity > currentStock) {
      return {
        valid: false,
        message: `Cannot remove ${quantity} units. Only ${currentStock} available.`,
        severity: "error",
      };
    }

    const afterStock = currentStock - quantity;
    if (minStock && afterStock < minStock) {
      return {
        valid: true,
        message: `Warning: Stock will fall below minimum (${minStock})`,
        severity: "warning",
      };
    }
  }

  // SET_STOCK validation
  if (adjustmentType === "SET_STOCK") {
    // Warn if overriding to a lower value AND below minimum stock
    if (quantity < currentStock) {
      const reduction = currentStock - quantity;

      // Check if also below minimum
      if (minStock && quantity < minStock) {
        return {
          valid: true,
          message: `Warning: Reducing stock by ${reduction} units to ${quantity} (below minimum of ${minStock})`,
          severity: "warning",
        };
      }

      return {
        valid: true,
        message: `Warning: Reducing stock by ${reduction} units (${currentStock} → ${quantity})`,
        severity: "warning",
      };
    }

    // If increasing stock, only warn if still below minimum
    if (quantity > currentStock && minStock && quantity < minStock) {
      return {
        valid: true,
        message: `Note: Stock increased to ${quantity}, but still below minimum of ${minStock}`,
        severity: "warning",
      };
    }

    // If setting to exact same value, no warning needed
    if (quantity === currentStock) {
      return {
        valid: true,
        message: "Stock level unchanged",
        severity: "info",
      };
    }
  }

  return { valid: true, severity: "info" };
};

/**
 * Calculate stock levels after adjustment
 */
export interface StockPreview {
  before: number;
  after: number;
  change: number;
  operation: "add" | "remove" | "set";
}

export const calculateStockPreview = (
  adjustmentType: AdjustmentType,
  quantity: number,
  currentStock: number,
): StockPreview => {
  switch (adjustmentType) {
    case "STOCK_IN":
      return {
        before: currentStock,
        after: currentStock + quantity,
        change: +quantity,
        operation: "add",
      };

    case "STOCK_OUT":
      return {
        before: currentStock,
        after: currentStock - quantity,
        change: -quantity,
        operation: "remove",
      };

    case "SET_STOCK":
      return {
        before: currentStock,
        after: quantity,
        change: quantity - currentStock,
        operation: "set",
      };

    default:
      throw new Error(`Unknown adjustment type: ${adjustmentType}`);
  }
};

/**
 * Format stock change for display
 */
export const formatStockChange = (change: number): string => {
  if (change === 0) return "No change";
  return change > 0 ? `+${change}` : `${change}`;
};

/**
 * Get color class for stock change
 */
export const getStockChangeColor = (change: number): string => {
  if (change > 0) return "text-green-600 dark:text-green-400";
  if (change < 0) return "text-red-600 dark:text-red-400";
  return "text-gray-600 dark:text-gray-400";
};

/**
 * Check if product is low on stock
 */
export const isLowStock = (currentStock: number, minStock: number): boolean => {
  return currentStock <= minStock;
};

/**
 * Calculate stock status
 */
export interface StockStatus {
  level: "critical" | "low" | "normal" | "high";
  message: string;
  color: string;
}

export const getStockStatus = (
  currentStock: number,
  minStock: number,
): StockStatus => {
  if (currentStock === 0) {
    return {
      level: "critical",
      message: "Out of stock",
      color: "red",
    };
  }

  if (currentStock < minStock * 0.5) {
    return {
      level: "critical",
      message: "Critical - Below half minimum",
      color: "red",
    };
  }

  if (currentStock < minStock) {
    return {
      level: "low",
      message: "Low stock - Below minimum",
      color: "orange",
    };
  }

  if (currentStock < minStock * 2) {
    return {
      level: "normal",
      message: "Normal stock level",
      color: "blue",
    };
  }

  return {
    level: "high",
    message: "Stock level healthy",
    color: "green",
  };
};

/**
 * Format quantity with units
 */
export const formatQuantity = (
  quantity: number,
  unit: string = "units",
): string => {
  return `${quantity} ${unit}`;
};

/**
 * Validate bulk stock operation
 */
export interface BulkStockValidation {
  valid: boolean;
  errors: Array<{
    productId: string;
    productName: string;
    message: string;
  }>;
  warnings: Array<{
    productId: string;
    productName: string;
    message: string;
  }>;
}

export const validateBulkStockAdjustment = (
  items: Array<{
    productId: string;
    productName: string;
    adjustmentType: AdjustmentType;
    quantity: number;
    currentStock: number;
    minStock?: number;
  }>,
): BulkStockValidation => {
  const errors: BulkStockValidation["errors"] = [];
  const warnings: BulkStockValidation["warnings"] = [];

  items.forEach((item) => {
    const validation = validateStockAdjustment(
      item.adjustmentType,
      item.quantity,
      item.currentStock,
      item.minStock,
    );

    if (!validation.valid) {
      errors.push({
        productId: item.productId,
        productName: item.productName,
        message: validation.message || "Invalid adjustment",
      });
    } else if (validation.severity === "warning" && validation.message) {
      warnings.push({
        productId: item.productId,
        productName: item.productName,
        message: validation.message,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Check if user has permission for inventory action
 */
export const canPerformInventoryAction = (
  action: "view" | "adjust" | "transfer" | "refund",
  userRole: "CASHIER" | "MANAGER" | "ADMIN" | "SYSTEM_ADMIN",
): boolean => {
  const permissions = {
    view: ["CASHIER", "MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    adjust: ["MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    transfer: ["MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    refund: ["CASHIER", "MANAGER", "ADMIN", "SYSTEM_ADMIN"],
  };

  return permissions[action]?.includes(userRole) ?? false;
};

/**
 * Generate default reason for adjustment
 */
export const generateDefaultReason = (
  adjustmentType: AdjustmentType,
  quantity: number,
  productName?: string,
): string => {
  const product = productName ? ` for ${productName}` : "";

  switch (adjustmentType) {
    case "STOCK_IN":
      return `Added ${quantity} units${product}`;
    case "STOCK_OUT":
      return `Removed ${quantity} units${product}`;
    case "SET_STOCK":
      return `Stock set to ${quantity} units${product}`;
    default:
      return "Stock adjustment";
  }
};

/**
 * Parse inventory history change type for display
 */
export const parseChangeType = (
  changeType: string,
): { label: string; icon: string; color: string } => {
  const types = {
    SET_STOCK: {
      label: "Set Stock",
      icon: "⚙️",
      color: "blue",
    },
    ADJUST_STOCK: {
      label: "Stock Adjustment",
      icon: "📦",
      color: "green",
    },
    MANUAL_ADJUST: {
      label: "Manual Adjustment",
      icon: "✏️",
      color: "orange",
    },
    ORDER_DEDUCT: {
      label: "Order Deduction",
      icon: "🛒",
      color: "red",
    },
    ORDER_RETURN: {
      label: "Refund/Return",
      icon: "↩️",
      color: "blue",
    },
    SET_MIN_STOCK: {
      label: "Min Stock Updated",
      icon: "📊",
      color: "gray",
    },
  };

  return (
    types[changeType as keyof typeof types] || {
      label: changeType,
      icon: "📝",
      color: "gray",
    }
  );
};

/**
 * Calculate stock turnover rate
 */
export const calculateTurnoverRate = (
  soldQuantity: number,
  averageStock: number,
  periodDays: number = 30,
): number => {
  if (averageStock === 0) return 0;
  return (soldQuantity / averageStock) * (365 / periodDays);
};

/**
 * Estimate reorder point
 */
export const estimateReorderPoint = (
  dailyUsage: number,
  leadTimeDays: number,
  safetyStockDays: number = 3,
): number => {
  return dailyUsage * (leadTimeDays + safetyStockDays);
};

/**
 * Format date for inventory history
 */
export const formatInventoryDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  if (diffDays === 1) {
    return `Yesterday at ${d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  if (diffDays < 7) {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Export utilities
 */
export const inventoryUtils = {
  validateStockAdjustment,
  calculateStockPreview,
  formatStockChange,
  getStockChangeColor,
  isLowStock,
  getStockStatus,
  formatQuantity,
  validateBulkStockAdjustment,
  canPerformInventoryAction,
  generateDefaultReason,
  parseChangeType,
  calculateTurnoverRate,
  estimateReorderPoint,
  formatInventoryDate,
};
