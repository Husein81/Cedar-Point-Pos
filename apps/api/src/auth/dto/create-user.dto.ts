import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(6),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const loginSchema = z.object({
  username: z.string(),
  password: z.string().min(6),
});
export type LoginDto = z.infer<typeof loginSchema>;
