import type { Floor, TableStatus } from "@repo/types";

// ============================================
// Table DTOs
// ============================================

/**
 * DTO for creating a new table
 */
export interface CreateTableDto {
    tableNumber: number;
    branchId: string;
    floorId?: string;
    name: string;
    capacity?: number;
}

/**
 * DTO for updating an existing table
 */
export interface UpdateTableDto {
    tableNumber?: number;
    floorId?: string | null;
    name?: string;
    capacity?: number;
    isActive?: boolean;
}

/**
 * DTO for updating table status
 */
export interface UpdateTableStatusDto {
    status: TableStatus;
}

/**
 * Table with floor relation included (partial floor data from API)
 */
export interface TableWithFloor {
    id: string;
    tableNumber: number;
    tenantId: string;
    branchId: string;
    floorId?: string | null;
    name: string;
    capacity: number;
    status: TableStatus;
    isActive: boolean;
    isDeleted: boolean;
    createdAt?: string;
    updatedAt?: string;
    floor?: {
        id: string;
        name: string;
    } | null;
}

/**
 * Table statistics for a branch
 */
export interface TableStats {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
}

// ============================================
// Floor DTOs
// ============================================

/**
 * DTO for creating a new floor
 */
export interface CreateFloorDto {
    branchId: string;
    name: string;
    order?: number;
}

/**
 * DTO for updating an existing floor
 */
export interface UpdateFloorDto {
    name?: string;
    order?: number;
}

/**
 * Floor with table count
 */
export interface FloorWithTableCount extends Floor {
    _count?: {
        tables: number;
    };
}
