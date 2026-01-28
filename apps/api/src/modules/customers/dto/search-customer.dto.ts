import { z } from 'zod';

export const SearchCustomerSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export type SearchCustomerDto = z.infer<typeof SearchCustomerSchema>;
