import { OrderStatus } from '@repo/types';
import z from 'zod';

export const createTicketDto = z.object({
  orderItemId: z.string(),
  station: z.string().optional(),
  status: z.enum(OrderStatus).optional(),
});
export type CreateTicketDto = z.infer<typeof createTicketDto>;
