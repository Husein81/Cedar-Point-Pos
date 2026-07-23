import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type {
  CashMovementInput,
  CloseShiftInput,
  OpenShiftInput,
} from "@/shared/schemas";

const SHIFT_QUERY_KEY = ["shifts"];

export const useCurrentShift = () =>
  useQuery({
    queryKey: [...SHIFT_QUERY_KEY, "current"],
    queryFn: () => invoke("shifts:current", undefined),
  });

export const useShifts = () =>
  useQuery({
    queryKey: [...SHIFT_QUERY_KEY, "list"],
    queryFn: () => invoke("shifts:list", undefined),
  });

export const useOpenShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OpenShiftInput) => invoke("shifts:open", input),
    onSuccess: () => {
      toast.success("Shift opened");
      queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to open shift"));
    },
  });
};

export const useCloseShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CloseShiftInput) => invoke("shifts:close", input),
    onSuccess: (shift) => {
      const diff = shift.difference ?? 0;
      toast.success(
        diff === 0
          ? "Shift closed — drawer balanced"
          : `Shift closed — difference ${diff > 0 ? "+" : ""}${diff.toFixed(2)}`,
      );
      queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to close shift"));
    },
  });
};

export const useCashMovement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CashMovementInput) =>
      invoke("shifts:cashMovement", input),
    onSuccess: () => {
      toast.success("Cash movement recorded");
      queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to record movement"));
    },
  });
};
