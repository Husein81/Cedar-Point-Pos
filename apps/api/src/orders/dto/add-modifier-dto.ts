import z from 'zod';

export const addModifierDto = z.object({
  modifierId: z.string(),
});
export type AddModifierDto = z.infer<typeof addModifierDto>;
