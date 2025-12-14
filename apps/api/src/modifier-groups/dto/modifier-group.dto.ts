import { ModifierType } from '@repo/db';
import z from 'zod';

export const createModifierGroupDto = z.object({
  name: z.string(),
  type: z.enum(ModifierType),
});
export type CreateModifierGroupDto = z.infer<typeof createModifierGroupDto>;

export const updateModifierGroupDto = z.object({
  name: z.string().optional(),
  type: z.enum(ModifierType).optional(),
});
export type UpdateModifierGroupDto = z.infer<typeof updateModifierGroupDto>;
