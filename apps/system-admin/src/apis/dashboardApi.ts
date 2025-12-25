import { apiFetch } from "./api";
import type {
  DashboardOverview,
  DashboardFinance,
  DashboardOperations,
  DashboardAlerts,
} from "@/types/dashboard";

/**
 * System Admin Dashboard API Client
 * All endpoints require SYSTEM_ADMIN role
 */
export const dashboardApi = {
  /**
   * Get system overview statistics
   * Returns tenant count, user count, branch count, and orders today
   */
  getOverview: async (): Promise<DashboardOverview> => {
    return apiFetch("/system-admin/dashboard/overview");
  },

  /**
   * Get financial snapshot
   * Returns total revenue for today
   */
  getFinance: async (): Promise<DashboardFinance> => {
    return apiFetch("/system-admin/dashboard/finance");
  },

  /**
   * Get operational health metrics
   * Returns open shifts, inactive devices, pending transfers
   */
  getOperations: async (): Promise<DashboardOperations> => {
    return apiFetch("/system-admin/dashboard/operations");
  },

  /**
   * Get system alerts
   * Returns low stock items count and stale devices count
   */
  getAlerts: async (): Promise<DashboardAlerts> => {
    return apiFetch("/system-admin/dashboard/alerts");
  },
};
