import type {
  CreateStaffInput,
  PaginationResponse,
  ResetPasswordInput,
  SetPinInput,
  StaffActivityQuery,
  StaffQuery,
  UpdateStaffInput,
} from "@repo/types";
import type {
  StaffActivity,
  StaffDetail,
  StaffSessionView,
  StaffView,
} from "@/dto/staff.dto";
import { api } from "./api";

export const staffApi = {
  /** Paginated, filterable staff list scoped to the tenant. */
  getStaff: async (
    query?: StaffQuery
  ): Promise<PaginationResponse<StaffView>> => {
    const response = await api.get("/staff", { params: query });
    return response.data;
  },

  /** Create a tenant staff member. */
  createStaff: async (data: CreateStaffInput): Promise<StaffView> => {
    const response = await api.post("/staff", data);
    return response.data;
  },

  /** Single staff profile with recent activity and the active POS session. */
  getStaffById: async (id: string): Promise<StaffDetail> => {
    const response = await api.get(`/staff/${id}`);
    return response.data;
  },

  /** Update mutable identity fields (security flags use dedicated calls). */
  updateStaff: async (
    id: string,
    data: UpdateStaffInput
  ): Promise<StaffView> => {
    const response = await api.patch(`/staff/${id}`, data);
    return response.data;
  },

  /** Flip `isActive`. */
  toggleActive: async (id: string): Promise<StaffView> => {
    const response = await api.patch(`/staff/${id}/toggle-active`);
    return response.data;
  },

  /** Flip POS register access. */
  togglePosAccess: async (id: string): Promise<StaffView> => {
    const response = await api.patch(`/staff/${id}/toggle-pos`);
    return response.data;
  },

  /** Set or reset the staff member's POS PIN. */
  setPin: async (
    id: string,
    data: SetPinInput
  ): Promise<{ message: string }> => {
    const response = await api.patch(`/staff/${id}/set-pin`, data);
    return response.data;
  },

  /** Reset the staff member's login password (revokes their refresh token). */
  resetPassword: async (
    id: string,
    data: ResetPasswordInput
  ): Promise<{ message: string }> => {
    const response = await api.patch(`/staff/${id}/reset-password`, data);
    return response.data;
  },

  /** Paginated activity log for a staff member. */
  getActivity: async (
    id: string,
    query?: StaffActivityQuery
  ): Promise<PaginationResponse<StaffActivity>> => {
    const response = await api.get(`/staff/${id}/activity`, { params: query });
    return response.data;
  },

  /** Force-close an open POS session by its id. */
  endSession: async (sessionId: string): Promise<StaffSessionView> => {
    const response = await api.patch(`/staff/sessions/${sessionId}/end`);
    return response.data;
  },
};
