import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { floorsApi } from "../apis/floorsApi";
import { useBranchStore } from "@/store/branchStore";
import type {
  CreateFloorDto,
  UpdateFloorDto,
  FloorWithTableCount,
} from "@/dto/tables.dto";
import type { Floor } from "@repo/types";

const FLOOR_QUERY_KEY = ["floors"];

/**
 * Get all floors for the current branch with table counts
 */
export const useFloorsByBranch = () => {
  const { branchId } = useBranchStore();

  return useQuery({
    queryKey: [...FLOOR_QUERY_KEY, "branch", branchId],
    queryFn: () => floorsApi.getFloorsByBranch(branchId!),
    staleTime: 300_000,
    enabled: !!branchId,
  });
};

/**
 * Get a specific floor by ID
 */
export const useFloor = (id: string) => {
  return useQuery<FloorWithTableCount>({
    queryKey: [...FLOOR_QUERY_KEY, id],
    queryFn: () => floorsApi.getFloor(id),
    staleTime: 300_000,
    enabled: !!id,
  });
};

/**
 * Create a new floor
 */
export const useCreateFloor = () => {
  const queryClient = useQueryClient();

  return useMutation<Floor, Error, CreateFloorDto>({
    mutationFn: floorsApi.createFloor,
    onSuccess: (data) => {
      toast.success(`Floor "${data.name}" created successfully`);
      queryClient.invalidateQueries({ queryKey: FLOOR_QUERY_KEY });
    },
    onError: (error) => {
      const message = error.message || "Failed to create floor";
      toast.error(message);
    },
  });
};

/**
 * Update a floor with optimistic updates
 */
export const useUpdateFloor = () => {
  const queryClient = useQueryClient();
  const { branchId } = useBranchStore();

  return useMutation<
    Floor,
    Error,
    { id: string; data: UpdateFloorDto },
    { previousFloors?: unknown }
  >({
    mutationFn: ({ id, data }) => floorsApi.updateFloor(id, data),

    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      const queryKey = [...FLOOR_QUERY_KEY, "branch", branchId!];
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousFloors = queryClient.getQueryData(queryKey);

      // Optimistic update
      queryClient.setQueryData(
        queryKey,
        (old: FloorWithTableCount[] | undefined) => {
          if (!old) return old;
          return old.map((floor) =>
            floor.id === id ? { ...floor, ...data } : floor,
          );
        },
      );

      return { previousFloors };
    },

    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousFloors) {
        queryClient.setQueryData(
          [...FLOOR_QUERY_KEY, "branch", branchId!],
          context.previousFloors,
        );
      }
      const message = error.message || "Failed to update floor";
      toast.error(message);
    },

    onSuccess: (data) => {
      toast.success(`Floor "${data.name}" updated successfully`);
    },

    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: FLOOR_QUERY_KEY });
    },
  });
};

/**
 * Delete a floor (soft delete) with optimistic updates
 */
export const useDeleteFloor = () => {
  const queryClient = useQueryClient();
  const { branchId } = useBranchStore();

  return useMutation({
    mutationFn: floorsApi.deleteFloor,

    onMutate: async (id) => {
      // Cancel outgoing refetches
      const queryKey = [...FLOOR_QUERY_KEY, "branch", branchId!];
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousFloors = queryClient.getQueryData(queryKey);

      // Optimistic update - remove floor from list
      queryClient.setQueryData(
        queryKey,
        (old: FloorWithTableCount[] | undefined) => {
          if (!old) return old;
          return old.filter((floor) => floor.id !== id);
        },
      );

      return { previousFloors };
    },

    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousFloors) {
        queryClient.setQueryData(
          [...FLOOR_QUERY_KEY, "branch", branchId!],
          context.previousFloors,
        );
      }
      const message = error.message || "Failed to delete floor";
      toast.error(message);
    },

    onSuccess: () => {
      toast.success("Floor deleted successfully. Tables have been unassigned.");
    },
  });
};
