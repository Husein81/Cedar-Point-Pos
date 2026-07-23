import type { PaginationResponse } from "@repo/types";
import type {
  CreateRecurringShiftScheduleInput,
  CreateShiftScheduleInput,
  ShiftScheduleBulkResult,
  ShiftScheduleQuery,
  ShiftScheduleRangeQuery,
  ShiftScheduleView,
  UpdateShiftScheduleInput,
} from "@/dto/shiftSchedule.dto";
import { api } from "../lib/api";

const BASE = "/shifts/schedules";

export const shiftScheduleApi = {
  /** Paginated, filterable schedule list scoped to the tenant. */
  getList: async (
    query?: ShiftScheduleQuery
  ): Promise<PaginationResponse<ShiftScheduleView>> => {
    const response = await api.get(BASE, { params: query });
    return response.data;
  },

  /** Bounded, non-paginated calendar feed for a date range. */
  getRange: async (
    query: ShiftScheduleRangeQuery
  ): Promise<ShiftScheduleView[]> => {
    const response = await api.get(`${BASE}/range`, { params: query });
    return response.data;
  },

  /** Single schedule with branch/user/device/publishedBy relations. */
  getById: async (id: string): Promise<ShiftScheduleView> => {
    const response = await api.get(`${BASE}/${id}`);
    return response.data;
  },

  /** Create a DRAFT schedule. */
  create: async (
    data: CreateShiftScheduleInput
  ): Promise<ShiftScheduleView> => {
    const response = await api.post(BASE, data);
    return response.data;
  },

  /** Create a dateless recurring weekly pattern (one DRAFT row). */
  createRecurring: async (
    data: CreateRecurringShiftScheduleInput
  ): Promise<ShiftScheduleView> => {
    const response = await api.post(`${BASE}/recurring`, data);
    return response.data;
  },

  /** Update a DRAFT or PUBLISHED schedule. */
  update: async (
    id: string,
    data: UpdateShiftScheduleInput
  ): Promise<ShiftScheduleView> => {
    const response = await api.patch(`${BASE}/${id}`, data);
    return response.data;
  },

  /** Hard-delete a DRAFT or CANCELLED schedule. */
  delete: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await api.delete(`${BASE}/${id}`);
    return response.data;
  },

  /** Transition a DRAFT or PUBLISHED schedule to CANCELLED. */
  cancel: async (id: string): Promise<ShiftScheduleView> => {
    const response = await api.patch(`${BASE}/${id}/cancel`);
    return response.data;
  },

  /** Publish a batch of DRAFT schedules (makes them visible to staff). */
  publish: async (ids: string[]): Promise<ShiftScheduleBulkResult> => {
    const response = await api.post(`${BASE}/publish`, { ids });
    return response.data;
  },

  /** Revert a batch of PUBLISHED schedules to DRAFT. */
  unpublish: async (ids: string[]): Promise<ShiftScheduleBulkResult> => {
    const response = await api.post(`${BASE}/unpublish`, { ids });
    return response.data;
  },
};
