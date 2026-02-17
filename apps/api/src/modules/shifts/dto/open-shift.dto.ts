import { z } from 'zod';

export const openShiftDto = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  startCash: z.number().min(0, 'Starting cash must be >= 0').default(0),
});

export type OpenShiftDto = z.infer<typeof openShiftDto>;
