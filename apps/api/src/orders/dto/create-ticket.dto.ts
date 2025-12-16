import { OrderStatus } from '@repo/db';
import z from 'zod';

export const createTicketDto = z.object({
  orderItemId: z.string(),
  station: z.string().optional(),
  status: z.nativeEnum(OrderStatus).optional(),
});
export type CreateTicketDto = z.infer<typeof createTicketDto>;
