import { z } from 'zod';

// ============================================
// Table DTOs
// ============================================

/**
 * DTO for creating a new table
 */
export const createTableDto = z.object({
    tableNumber: z.number().int().positive('Table number must be a positive integer'),
    branchId: z.string().cuid('Invalid branch ID'),
    floorId: z.string().cuid('Invalid floor ID').optional(),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    capacity: z.number().int().positive('Capacity must be positive').default(4),
});
export type CreateTableDto = z.infer<typeof createTableDto>;

/**
 * DTO for updating an existing table
 */
export const updateTableDto = z.object({
    tableNumber: z.number().int().positive('Table number must be a positive integer').optional(),
    floorId: z.string().cuid('Invalid floor ID').nullable().optional(),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    capacity: z.number().int().positive('Capacity must be positive').optional(),
    isActive: z.boolean().optional(),
});
export type UpdateTableDto = z.infer<typeof updateTableDto>;

/**
 * DTO for updating table status
 */
export const updateTableStatusDto = z.object({
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED'], {
        message: 'Status must be AVAILABLE, OCCUPIED, or RESERVED',
    }),
});
export type UpdateTableStatusDto = z.infer<typeof updateTableStatusDto>;

// ============================================
// Floor DTOs
// ============================================

/**
 * DTO for creating a new floor
 */
export const createFloorDto = z.object({
    branchId: z.string().cuid('Invalid branch ID'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    order: z.number().int().min(0, 'Order must be non-negative').default(0),
});
export type CreateFloorDto = z.infer<typeof createFloorDto>;

/**
 * DTO for updating an existing floor
 */
export const updateFloorDto = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    order: z.number().int().min(0, 'Order must be non-negative').optional(),
});
export type UpdateFloorDto = z.infer<typeof updateFloorDto>;
