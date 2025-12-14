import { z } from 'zod';

export const TransferItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});
export type TransferItemDto = z.infer<typeof TransferItemSchema>;

export const CreateTransferSchema = z.object({
  fromBranchId: z.string(),
  toBranchId: z.string(),
  items: z.array(TransferItemSchema).min(1),
  notes: z.string().optional(),
});

export type CreateTransferDto = z.infer<typeof CreateTransferSchema>;
