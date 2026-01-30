import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
});

export type CreateCustomerDto = z.infer<typeof CreateCustomerSchema>;
