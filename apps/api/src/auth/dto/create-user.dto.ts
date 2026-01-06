import { z } from 'zod';
import { UserRole } from '../../../generated/prisma/client.js';

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string(),
  username: z.string().min(1),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  tenantId: z.string().uuid(),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const loginSchema = z.object({
  username: z.string(),
  password: z.string().min(6),
});
export type LoginDto = z.infer<typeof loginSchema>;
