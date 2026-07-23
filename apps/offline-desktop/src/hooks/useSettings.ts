import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type { UpdateSettingsInput } from "@/shared/schemas";

const SETTINGS_QUERY_KEY = ["settings"];

export const useSettings = () =>
  useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => invoke("settings:get", undefined),
    staleTime: 10 * 60 * 1000,
  });

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSettingsInput) =>
      invoke("settings:update", input),
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to save settings"));
    },
  });
};

export const useExportBackup = () =>
  useMutation({
    mutationFn: () => invoke("backup:export", undefined),
    onSuccess: (result) => {
      if (result) toast.success(`Backup saved to ${result.path}`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Backup failed"));
    },
  });

export const useRestoreBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke("backup:restore", undefined),
    onSuccess: (result) => {
      if (result.restored) {
        toast.success("Backup restored");
        queryClient.invalidateQueries();
      }
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Restore failed"));
    },
  });
};
