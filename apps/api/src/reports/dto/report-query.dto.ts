import { z } from 'zod';

export const reportQuerySchema = z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    branchId: z.string().cuid().optional(),
});

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;
