import { create } from "zustand";
import type { TableUiStatus } from "@/components/tables/config";

export type TablesView = "canvas" | "grid";

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export interface TablesFilters {
  search: string;
  /** Empty array = all statuses. */
  statuses: TableUiStatus[];
  minCapacity: number | null;
}

interface TableUiState {
  // Selection / drawer
  selectedTableId: string | null;
  // Filters & navigation
  filters: TablesFilters;
  activeFloorId: string | "ALL";
  view: TablesView;
  isSidebarOpen: boolean;
  // Floor editor (draft geometry lives in useFloorEditor, not here)
  isEditingLayout: boolean;
  // Last committed canvas transform per floor key (gesture-end snapshots)
  transforms: Record<string, CanvasTransform>;

  selectTable: (tableId: string | null) => void;
  setSearch: (search: string) => void;
  toggleStatusFilter: (status: TableUiStatus) => void;
  clearFilters: () => void;
  setMinCapacity: (min: number | null) => void;
  setActiveFloor: (floorId: string | "ALL") => void;
  setView: (view: TablesView) => void;
  setEditingLayout: (editing: boolean) => void;
  setTransform: (floorKey: string, transform: CanvasTransform) => void;
}

const DEFAULT_FILTERS: TablesFilters = {
  search: "",
  statuses: [],
  minCapacity: null,
};

/**
 * Client/UI state for the Table Management page (selection, filters, canvas
 * transform, editor mode). Server data stays in TanStack Query.
 */
export const useTableUiStore = create<TableUiState>((set) => ({
  selectedTableId: null,
  filters: DEFAULT_FILTERS,
  activeFloorId: "ALL",
  view: "canvas",
  isSidebarOpen: true,
  isEditingLayout: false,
  transforms: {},

  selectTable: (tableId) => set({ selectedTableId: tableId }),

  setSearch: (search) =>
    set((state) => ({ filters: { ...state.filters, search } })),

  toggleStatusFilter: (status) =>
    set((state) => {
      const active = state.filters.statuses.includes(status);
      return {
        filters: {
          ...state.filters,
          statuses: active
            ? state.filters.statuses.filter((s) => s !== status)
            : [...state.filters.statuses, status],
        },
      };
    }),

  clearFilters: () => set({ filters: DEFAULT_FILTERS }),

  setMinCapacity: (minCapacity) =>
    set((state) => ({ filters: { ...state.filters, minCapacity } })),

  setActiveFloor: (activeFloorId) => set({ activeFloorId }),

  setView: (view) => set({ view }),

  setEditingLayout: (isEditingLayout) =>
    set(
      isEditingLayout
        ? { isEditingLayout, selectedTableId: null }
        : { isEditingLayout },
    ),

  setTransform: (floorKey, transform) =>
    set((state) => ({
      transforms: { ...state.transforms, [floorKey]: transform },
    })),
}));
