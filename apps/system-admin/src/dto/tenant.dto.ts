import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*                         Enums (use your existing)                           */
/* -------------------------------------------------------------------------- */
/**
 * If you already have zod enums elsewhere, reuse them.
 * Otherwise define them like this (adjust values to match your Prisma enums):
 */
export const BusinessTypeSchema = z.enum(["RETAIL", "RESTAURANT"]);
export type BusinessType = z.infer<typeof BusinessTypeSchema>;

export const UserRoleSchema = z.enum([
  "SYSTEM_ADMIN",
  "ADMIN",
  "MANAGER",
  "CASHIER",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

/* -------------------------------------------------------------------------- */
/*                               TenantWithCount                               */
/* -------------------------------------------------------------------------- */

export const TenantCountSchema = z.object({
  users: z.number().int().nonnegative(),
  branches: z.number().int().nonnegative(),
});

export const TenantWithCountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  businessType: BusinessTypeSchema,
  createdAt: z.string(), // keep string since you're using string in types (ISO)
  updatedAt: z.string(),
  settings: z.unknown(),
  _count: TenantCountSchema,
});

export type TenantWithCount = z.infer<typeof TenantWithCountSchema>;

/* -------------------------------------------------------------------------- */
/*                                  TenantUser                                 */
/* -------------------------------------------------------------------------- */

export const TenantUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().nullable(),
  username: z.string().min(3),
  role: UserRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TenantUser = z.infer<typeof TenantUserSchema>;

/* -------------------------------------------------------------------------- */
/*                               CreateTenantPayload                            */
/* -------------------------------------------------------------------------- */

export const CreateTenantPayloadSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  businessType: BusinessTypeSchema,
});

export type CreateTenantPayload = z.infer<typeof CreateTenantPayloadSchema>;

/* -------------------------------------------------------------------------- */
/*                                CreateUserPayload                             */
/* -------------------------------------------------------------------------- */

export const CreateUserPayloadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: UserRoleSchema,
  tenantId: z.string().min(1, "Tenant ID is required"),
});

export type CreateUserPayload = z.infer<typeof CreateUserPayloadSchema>;
