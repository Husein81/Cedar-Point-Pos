import type { Floor } from "@repo/types";
import { api } from "./api";
import type {
    CreateFloorDto,
    UpdateFloorDto,
    FloorWithTableCount,
} from "@/dto/tables.dto";

export const floorsApi = {
    /**
     * Get all floors for a branch with table counts
     */
    getFloorsByBranch: async (
        branchId: string
    ): Promise<FloorWithTableCount[]> => {
        const response = await api.get<FloorWithTableCount[]>(
            `/floors/branch/${branchId}`
        );
        return response.data;
    },

    /**
     * Get a specific floor by ID
     */
    getFloor: async (id: string): Promise<FloorWithTableCount> => {
        const response = await api.get<FloorWithTableCount>(`/floors/${id}`);
        return response.data;
    },

    /**
     * Get all tables for a floor
     */
    getTablesByFloor: async (floorId: string): Promise<Floor[]> => {
        const response = await api.get<Floor[]>(`/floors/${floorId}/tables`);
        return response.data;
    },

    /**
     * Create a new floor
     */
    createFloor: async (data: CreateFloorDto): Promise<Floor> => {
        const response = await api.post<Floor>("/floors", data);
        return response.data;
    },

    /**
     * Update a floor
     */
    updateFloor: async (id: string, data: UpdateFloorDto): Promise<Floor> => {
        const response = await api.put<Floor>(`/floors/${id}`, data);
        return response.data;
    },

    /**
     * Delete a floor (soft delete)
     */
    deleteFloor: async (id: string): Promise<void> => {
        await api.delete(`/floors/${id}`);
    },
};
