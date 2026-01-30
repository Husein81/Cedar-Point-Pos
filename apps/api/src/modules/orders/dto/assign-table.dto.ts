import z from 'zod';

export const assignTableDto = z.object({
  tableId: z.string().optional(),
});
export type AssignTableDto = z.infer<typeof assignTableDto>;
