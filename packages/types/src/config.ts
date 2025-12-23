import z from "zod";

export const email = z
  .string()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address");

export const decimal = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => /^-?\d+(\.\d+)?$/.test(v), "Invalid decimal string");
export type Decimal = z.infer<typeof decimal>;

export const cuid = z.string().regex(/^c[0-9a-z]{24,}$/, "Invalid CUID");
export const isoDate = z.coerce.date();
