import type {
  CashMovement,
  PaginationResponse,
  Shift,
} from "@repo/types";
import { api } from "./api";
import type {
  ApproveCloseDto,
  ClosePreviewResponse,
  ClosePreviewDto,
  CloseShiftDto,
  CreateCashMovementDto,
  CreateScheduleDto,
  OpenShiftDto,
  PaginatedShiftScheduleResponse,
  PublishScheduleDto,
  ScheduleFilters,
  ShiftScheduleWithRelations,
  ShiftFilters,
  UpdateScheduleDto,
  XReportResponse,
} from "@/dto/shift.dto";

// ── Close Preview Response ───────────────────────────────────────────────────
export const shiftsApi = {
  // ── Shift Lifecycle ──────────────────────────────────────────────────────

  // Open a new shift
  openShift: async (data: OpenShiftDto): Promise<Shift> => {
    const response = await api.post<Shift>("/shifts/open", data);
    return response.data;
  },

  // Get current open shift for device/branch
  getCurrentShift: async (
    deviceId?: string,
    branchId?: string,
  ): Promise<Shift | null> => {
    const response = await api.get<Shift | null>("/shifts/current", {
      params: { deviceId, branchId },
    });
    return response.data;
  },

  // List shifts with pagination
  getShifts: async (
    filters?: ShiftFilters,
  ): Promise<PaginationResponse<Shift>> => {
    const response = await api.get<PaginationResponse<Shift>>("/shifts", {
      params: filters,
    });
    return response.data;
  },

  // Get shift by ID
  getShift: async (id: string): Promise<Shift> => {
    const response = await api.get<Shift>(`/shifts/${id}`);
    return response.data;
  },

  // Close preview — compute expected cash and variance info
  closePreview: async (
    id: string,
    data: ClosePreviewDto,
  ): Promise<ClosePreviewResponse> => {
    const response = await api.post<ClosePreviewResponse>(
      `/shifts/${id}/close-preview`,
      data,
    );
    return response.data;
  },

  // Close a shift
  closeShift: async (id: string, data: CloseShiftDto): Promise<Shift> => {
    const response = await api.post<Shift>(`/shifts/${id}/close`, data);
    return response.data;
  },

  // Approve close (manager/admin only)
  approveClose: async (id: string, data: ApproveCloseDto): Promise<Shift> => {
    const response = await api.post<Shift>(`/shifts/${id}/approve-close`, data);
    return response.data;
  },

  // Get X report (live mid-shift snapshot)
  getXReport: async (id: string): Promise<XReportResponse> => {
    const response = await api.get<XReportResponse>(`/shifts/${id}/x-report`);
    return response.data;
  },

  // Create a manual cash movement
  createCashMovement: async (
    shiftId: string,
    data: CreateCashMovementDto,
  ): Promise<CashMovement> => {
    const response = await api.post<CashMovement>(
      `/shifts/${shiftId}/cash-movements`,
      data,
    );
    return response.data;
  },

  // ── Shift Schedules ────────────────────────────────────────────────────

  // List all schedules (admin/manager)
  getSchedules: async (
    filters?: ScheduleFilters,
  ): Promise<PaginatedShiftScheduleResponse> => {
    const response = await api.get<PaginatedShiftScheduleResponse>(
      "/shifts/schedules",
      { params: filters },
    );
    return response.data;
  },

  // Get my schedules (cashier's own view)
  getMySchedules: async (
    filters?: ScheduleFilters,
  ): Promise<PaginatedShiftScheduleResponse> => {
    const response = await api.get<PaginatedShiftScheduleResponse>(
      "/shifts/schedules/me",
      { params: filters },
    );
    return response.data;
  },

  // Get schedule by ID
  getSchedule: async (id: string): Promise<ShiftScheduleWithRelations> => {
    const response = await api.get<ShiftScheduleWithRelations>(
      `/shifts/schedules/${id}`,
    );
    return response.data;
  },

  // Create a schedule
  createSchedule: async (
    data: CreateScheduleDto,
  ): Promise<ShiftScheduleWithRelations> => {
    const response = await api.post<ShiftScheduleWithRelations>(
      "/shifts/schedules",
      data,
    );
    return response.data;
  },

  // Update a schedule
  updateSchedule: async (
    id: string,
    data: UpdateScheduleDto,
  ): Promise<ShiftScheduleWithRelations> => {
    const response = await api.patch<ShiftScheduleWithRelations>(
      `/shifts/schedules/${id}`,
      data,
    );
    return response.data;
  },

  // Delete a schedule
  deleteSchedule: async (id: string): Promise<void> => {
    await api.delete(`/shifts/schedules/${id}`);
  },

  // Publish schedules (bulk)
  publishSchedules: async (
    data: PublishScheduleDto,
  ): Promise<{ published: number; ids: string[] }> => {
    const response = await api.post<{ published: number; ids: string[] }>(
      "/shifts/schedules/publish",
      data,
    );
    return response.data;
  },

  // Unpublish schedules (bulk)
  unpublishSchedules: async (
    data: PublishScheduleDto,
  ): Promise<{ unpublished: number; ids: string[] }> => {
    const response = await api.post<{ unpublished: number; ids: string[] }>(
      "/shifts/schedules/unpublish",
      data,
    );
    return response.data;
  },
};
