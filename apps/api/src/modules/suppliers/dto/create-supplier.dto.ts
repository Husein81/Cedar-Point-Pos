import { z } from 'zod';

export const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  companyName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  address: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSupplierDto = z.infer<typeof CreateSupplierSchema>;
