import type { Table, Order } from "@repo/types";
import { api } from "./api";
import type {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableStatusDto,
  TableWithFloor,
  TableStats,
} from "@/dto/tables.dto";

export const tablesApi = {
  /**
   * Get all tables for a branch
   */
  getTablesByBranch: async (branchId: string): Promise<TableWithFloor[]> => {
    const response = await api.get<TableWithFloor[]>(
      `/tables/branch/${branchId}`,
    );
    return response.data;
  },

  /**
   * Get all tables for a specific floor
   */
  getTablesByFloor: async (floorId: string): Promise<Table[]> => {
    const response = await api.get<Table[]>(`/tables/floor/${floorId}`);
    return response.data;
  },

  /**
   * Get table statistics for a branch
   */
  getTableStats: async (branchId: string): Promise<TableStats> => {
    const response = await api.get<TableStats>(
      `/tables/branch/${branchId}/stats`,
    );
    return response.data;
  },

  /**
   * Get a specific table by ID
   */
  getTable: async (id: string): Promise<TableWithFloor> => {
    const response = await api.get<TableWithFloor>(`/tables/${id}`);
    return response.data;
  },

  /**
   * Create a new table
   */
  createTable: async (data: CreateTableDto): Promise<TableWithFloor> => {
    const response = await api.post("/tables", data);
    return response.data;
  },

  /**
   * Update a table
   */
  updateTable: async (
    id: string,
    data: UpdateTableDto,
  ): Promise<TableWithFloor> => {
    const response = await api.put<TableWithFloor>(`/tables/${id}`, data);
    return response.data;
  },

  /**
   * Update table status
   */
  updateTableStatus: async (
    id: string,
    data: UpdateTableStatusDto,
  ): Promise<TableWithFloor> => {
    const response = await api.patch<TableWithFloor>(
      `/tables/${id}/status`,
      data,
    );
    return response.data;
  },

  /**
   * Get active (non-terminal) orders for a specific table
   */
  getActiveOrdersByTable: async (tableId: string): Promise<Order[]> => {
    const response = await api.get<Order[]>(`/tables/${tableId}/active-orders`);
    return response.data;
  },

  /**
   * Delete a table (soft delete)
   */
  deleteTable: async (id: string): Promise<void> => {
    await api.delete(`/tables/${id}`);
  },
};
