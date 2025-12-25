// ============================================
// Dashboard API Response Types
// ============================================

export interface DashboardOverview {
  tenants: number;
  users: number;
  branches: number;
  ordersToday: number;
}

export interface DashboardFinance {
  totalRevenueToday: {
    _sum: {
      total: string | number | null; // Prisma Decimal serializes as string
    };
  };
}

export interface DashboardOperations {
  openShifts: number;
  inactiveDevices: number;
  pendingTransfers: number;
}

export interface DashboardAlerts {
  lowStockItems: number;
  staleDevices: number;
}

// Combined dashboard data for convenience
export interface DashboardData {
  overview: DashboardOverview | null;
  finance: DashboardFinance | null;
  operations: DashboardOperations | null;
  alerts: DashboardAlerts | null;
}
