export const TABLE_CONSTANTS = {
  MAX_CAPACITY: 20,
  MIN_CAPACITY: 1,
  DEFAULT_CAPACITY: 4,
  TABLE_NUMBER_MIN: 1,
  MAX_TABLES_PER_FLOOR: 100,
} as const;

/**
 * Toast notification messages
 */
export const TOAST_MESSAGES = {
  TABLE: {
    CREATED: (name: string) => `Table "${name}" created successfully`,
    UPDATED: (name: string) => `Table "${name}" updated successfully`,
    DELETED: "Table deleted successfully",
    STATUS_UPDATED: (status: string) =>
      `Table status updated to ${status.toLowerCase()}`,
    DELETE_WITH_ORDERS: "Cannot delete table with active orders",
  },
  FLOOR: {
    CREATED: (name: string) => `Floor "${name}" created successfully`,
    UPDATED: (name: string) => `Floor "${name}" updated successfully`,
    DELETED: "Floor deleted successfully. Tables have been unassigned.",
    DELETE_WITH_TABLES: "Cannot delete floor with active tables",
  },
  ERROR: {
    LOAD_TABLES: "Failed to load tables",
    CREATE_TABLE: "Failed to create table",
    UPDATE_TABLE: "Failed to update table",
    DELETE_TABLE: "Failed to delete table",
    UPDATE_STATUS: "Failed to update table status",
    LOAD_FLOORS: "Failed to load floors",
    CREATE_FLOOR: "Failed to create floor",
    UPDATE_FLOOR: "Failed to update floor",
    DELETE_FLOOR: "Failed to delete floor",
    NO_BRANCH: "Please select a branch to manage tables",
  },
} as const;

/**
 * React Query configuration constants
 * Centralizes cache and retry settings
 */
export const QUERY_CONFIG = {
  STALE_TIME: {
    TABLES: 60_000, // 1 minute - moderate change frequency
    STATS: 30_000, // 30 seconds - frequent updates
    FLOORS: 300_000, // 5 minutes - infrequent changes
    SINGLE_TABLE: 120_000, // 2 minutes - rarely changes once loaded
    SINGLE_FLOOR: 300_000, // 5 minutes - rarely changes
  },
  RETRY: {
    COUNT: 3,
    DELAY: 1000, // 1 second base delay
  },
  CACHE_TIME: {
    DEFAULT: 5 * 60 * 1000, // 5 minutes
    LONG: 10 * 60 * 1000, // 10 minutes
  },
} as const;

/**
 * Table status display configuration
 */
export const TABLE_STATUS_CONFIG = {
  AVAILABLE: {
    label: "Available",
    color: "text-emerald-500",
    bgClass: "bg-emerald-500/10 border-emerald-500/50 hover:border-emerald-400",
    icon: "CircleCheck" as const,
  },
  OCCUPIED: {
    label: "Occupied",
    color: "text-red-500",
    bgClass: "bg-red-500/10 border-red-500/50 hover:border-red-400",
    icon: "Users" as const,
  },
  RESERVED: {
    label: "Reserved",
    color: "text-amber-500",
    bgClass: "bg-amber-500/10 border-amber-500/50 hover:border-amber-400",
    icon: "Clock" as const,
  },
} as const;

/**
 * UI/UX constants
 */
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300, // Delay for search inputs
  TOAST_DURATION: 3000, // Default toast display duration
  ANIMATION_DURATION: 200, // Default animation duration
  MAX_MODAL_WIDTH: 480, // Maximum width for modals
} as const;
