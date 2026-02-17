import { z } from 'zod';

// ─── Offer DTOs ───

export const createOfferSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  basePrice: z.coerce.number().min(0, 'Base price must be >= 0'),
});
export type CreateOfferDto = z.infer<typeof createOfferSchema>;

export const updateOfferSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  basePrice: z.coerce.number().min(0, 'Base price must be >= 0').optional(),
  isActive: z.boolean().optional(),
});
export type UpdateOfferDto = z.infer<typeof updateOfferSchema>;

// ─── OfferGroup DTOs ───

export const createOfferGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  freeItemsCount: z.coerce
    .number()
    .int()
    .min(0, 'Free items count must be >= 0')
    .default(0),
});
export type CreateOfferGroupDto = z.infer<typeof createOfferGroupSchema>;

export const updateOfferGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  freeItemsCount: z.coerce
    .number()
    .int()
    .min(0, 'Free items count must be >= 0')
    .optional(),
});
export type UpdateOfferGroupDto = z.infer<typeof updateOfferGroupSchema>;

// ─── OfferGroupItem DTOs ───

export const createOfferGroupItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  extraPrice: z.coerce
    .number()
    .min(0, 'Extra price must be >= 0')
    .default(0),
});
export type CreateOfferGroupItemDto = z.infer<
  typeof createOfferGroupItemSchema
>;

export const updateOfferGroupItemSchema = z.object({
  extraPrice: z.coerce.number().min(0, 'Extra price must be >= 0'),
});
export type UpdateOfferGroupItemDto = z.infer<
  typeof updateOfferGroupItemSchema
>;
