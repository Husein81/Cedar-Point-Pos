import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import type {
  CreateStaffInput,
  PaginationResponse,
  ResetPasswordInput,
  SetPinInput,
  StaffActivityQuery,
  StaffQuery,
  UpdateStaffInput,
} from "@repo/types";
import { staffApi } from "@/apis/staffApi";
import type {
  StaffActivity,
  StaffDetail,
  StaffSessionView,
  StaffView,
} from "@/dto/staff.dto";
import { extractErrorMessage } from "@/utils/error";

const STAFF_QUERY_KEY = ["staff"];

// ─── Queries ───

/** Paginated, filterable staff list. */
export const useStaffList = (query?: StaffQuery) => {
  return useQuery<PaginationResponse<StaffView>>({
    queryKey: [...STAFF_QUERY_KEY, "list", query],
    queryFn: () => staffApi.getStaff(query),
    staleTime: 60 * 1000,
  });
};

/** Single staff member with recent activity and active session. */
export const useStaffMember = (id: string | null) => {
  return useQuery<StaffDetail>({
    queryKey: [...STAFF_QUERY_KEY, id],
    queryFn: () => staffApi.getStaffById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

/** Paginated activity log for a staff member. */
export const useStaffActivity = (
  id: string | null,
  query?: StaffActivityQuery
) => {
  return useQuery<PaginationResponse<StaffActivity>>({
    queryKey: [...STAFF_QUERY_KEY, id, "activity", query],
    queryFn: () => staffApi.getActivity(id!, query),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

// ─── Mutations ───

export const useCreateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation<StaffView, Error, CreateStaffInput>({
    mutationFn: staffApi.createStaff,
    onSuccess: () => {
      toast.success("Staff member created successfully");
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create staff member"));
    },
  });
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation<StaffView, Error, { id: string; data: UpdateStaffInput }>({
    mutationFn: ({ id, data }) => staffApi.updateStaff(id, data),
    onSuccess: () => {
      toast.success("Staff member updated successfully");
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update staff member"));
    },
  });
};

export const useToggleStaffActive = () => {
  const queryClient = useQueryClient();

  return useMutation<StaffView, Error, string>({
    mutationFn: staffApi.toggleActive,
    onSuccess: (data) => {
      toast.success(
        data.isActive ? "Staff member activated" : "Staff member deactivated"
      );
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update staff status"));
    },
  });
};

export const useToggleStaffPos = () => {
  const queryClient = useQueryClient();

  return useMutation<StaffView, Error, string>({
    mutationFn: staffApi.togglePosAccess,
    onSuccess: (data) => {
      toast.success(
        data.hasPosAccess ? "POS access granted" : "POS access revoked"
      );
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update POS access"));
    },
  });
};

export const useSetStaffPin = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    { id: string; data: SetPinInput }
  >({
    mutationFn: ({ id, data }) => staffApi.setPin(id, data),
    onSuccess: (result) => {
      toast.success(result.message);
      // `isPinSet` is shown in both the list and the detail view.
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to set PIN"));
    },
  });
};

export const useResetStaffPassword = () => {
  return useMutation<
    { message: string },
    Error,
    { id: string; data: ResetPasswordInput }
  >({
    mutationFn: ({ id, data }) => staffApi.resetPassword(id, data),
    onSuccess: (result) => {
      // No cached staff view changes on a password reset — just confirm.
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to reset password"));
    },
  });
};

export const useEndStaffSession = () => {
  const queryClient = useQueryClient();

  return useMutation<StaffSessionView, Error, string>({
    mutationFn: staffApi.endSession,
    onSuccess: () => {
      toast.success("Session ended");
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to end session"));
    },
  });
};
