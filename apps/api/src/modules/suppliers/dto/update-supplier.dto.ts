import { z } from 'zod';

export const UpdateSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  companyName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  address: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  currentBalance: z.number().optional(),
});

export type UpdateSupplierDto = z.infer<typeof UpdateSupplierSchema>;
