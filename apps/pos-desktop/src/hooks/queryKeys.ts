/**
 * Centralized query key factory for tables and floors
 * Provides type-safe, consistent query keys for React Query
 */

export const tableKeys = {
  /**
   * Base key for all table queries
   */
  all: ["tables"] as const,

  /**
   * Keys for list-type queries
   */
  lists: () => [...tableKeys.all, "list"] as const,

  /**
   * Key for table list with filters
   */
  list: (filters: Record<string, any>) =>
    [...tableKeys.lists(), filters] as const,

  /**
   * Keys for detail/single table queries
   */
  details: () => [...tableKeys.all, "detail"] as const,

  /**
   * Key for single table by ID
   */
  detail: (id: string) => [...tableKeys.details(), id] as const,

  /**
   * Key for tables by branch
   */
  byBranch: (branchId: string) =>
    [...tableKeys.lists(), "branch", branchId] as const,

  /**
   * Key for tables by floor
   */
  byFloor: (floorId: string) =>
    [...tableKeys.lists(), "floor", floorId] as const,

  /**
   * Key for table statistics
   */
  stats: (branchId: string) => [...tableKeys.all, "stats", branchId] as const,

  /**
   * Key for active orders on a specific table
   */
  activeOrders: (tableId: string) =>
    [...tableKeys.all, "active-orders", tableId] as const,
};

export const floorKeys = {
  /**
   * Base key for all floor queries
   */
  all: ["floors"] as const,

  /**
   * Keys for list-type queries
   */
  lists: () => [...floorKeys.all, "list"] as const,

  /**
   * Key for floors by branch
   */
  byBranch: (branchId: string) =>
    [...floorKeys.lists(), "branch", branchId] as const,

  /**
   * Keys for detail/single floor queries
   */
  details: () => [...floorKeys.all, "detail"] as const,

  /**
   * Key for single floor by ID
   */
  detail: (id: string) => [...floorKeys.details(), id] as const,
};

/**
 * Stale time constants for consistent cache configuration
 * Values in milliseconds
 */
export const STALE_TIME = {
  /** Table data - moderate change frequency (1 minute) */
  TABLES: 60_000,

  /** Table statistics - frequent updates (30 seconds) */
  STATS: 30_000,

  /** Single table - rarely changes once loaded (2 minutes) */
  SINGLE_TABLE: 120_000,

  /** Floor data - infrequent changes (5 minutes) */
  FLOORS: 300_000,

  /** Single floor - rarely changes (5 minutes) */
  SINGLE_FLOOR: 300_000,
} as const;
