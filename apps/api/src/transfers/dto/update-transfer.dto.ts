import { TransferStatus } from '@repo/db';
import z from 'zod';

export const updateTransferSchema = z.object({
  status: z.enum(TransferStatus).optional(),
  notes: z.string().optional(),
});
export type UpdateTransferDto = z.infer<typeof updateTransferSchema>;
