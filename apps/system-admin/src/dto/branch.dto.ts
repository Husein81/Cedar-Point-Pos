import { z } from "zod";

export const BranchSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Branch = z.infer<typeof BranchSchema>;

export const CreateBranchPayloadSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type CreateBranchPayload = z.infer<typeof CreateBranchPayloadSchema>;

export const UpdateBranchPayloadSchema = z.object({
  name: z.string().min(1, "Branch name is required").optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type UpdateBranchPayload = z.infer<typeof UpdateBranchPayloadSchema>;
