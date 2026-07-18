export const TABLE_CONSTANTS = {
  MAX_CAPACITY: 20,
  MIN_CAPACITY: 1,
  DEFAULT_CAPACITY: 4,
  TABLE_NUMBER_MIN: 1,
  MAX_TABLES_PER_FLOOR: 100,
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
