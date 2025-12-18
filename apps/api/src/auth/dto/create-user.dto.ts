import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginDto = z.infer<typeof loginSchema>;
