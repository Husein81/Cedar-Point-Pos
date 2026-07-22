import { z } from "zod";
import { BusinessType, UserRole } from "@repo/types";

export type { BusinessType, UserRole };

const BusinessTypeSchema = z.enum(
  Object.values(BusinessType) as [BusinessType, ...BusinessType[]]
);
const UserRoleSchema = z.enum(
  Object.values(UserRole) as [UserRole, ...UserRole[]]
);

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
  code: z.string().nullable(),
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
  code: z
    .string()
    .regex(
      /^[A-Z0-9-]{3,20}$/,
      "Code must be 3-20 uppercase letters, digits, or hyphens"
    )
    .optional(),
});

export type CreateTenantPayload = z.infer<typeof CreateTenantPayloadSchema>;

/* -------------------------------------------------------------------------- */
/*                               UpdateTenantPayload                            */
/* -------------------------------------------------------------------------- */

export const UpdateTenantPayloadSchema = z.object({
  name: z.string().min(1, "Tenant name is required").optional(),
  businessType: BusinessTypeSchema.optional(),
  code: z
    .string()
    .regex(
      /^[A-Z0-9-]{3,20}$/,
      "Code must be 3-20 uppercase letters, digits, or hyphens"
    )
    .optional(),
});

export type UpdateTenantPayload = z.infer<typeof UpdateTenantPayloadSchema>;

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
