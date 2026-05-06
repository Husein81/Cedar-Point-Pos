import { z } from "zod";

// ─── Offer DTOs ───

export const CreateOfferSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  basePrice: z.coerce.number().min(0, "Base price must be >= 0"),
});
export type CreateOfferDto = z.infer<typeof CreateOfferSchema>;

export const UpdateOfferSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  basePrice: z.coerce.number().min(0, "Base price must be >= 0").optional(),
  isActive: z.boolean().optional(),
});
export type UpdateOfferDto = z.infer<typeof UpdateOfferSchema>;

// ─── OfferGroup DTOs ───

export const CreateOfferGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  maxItemsCount: z.number(),
  freeItemsCount: z.coerce
    .number()
    .int()
    .min(0, "Free items count must be >= 0")
    .default(0),
});
export type CreateOfferGroupDto = z.infer<typeof CreateOfferGroupSchema>;

export const UpdateOfferGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  maxItemsCount: z.number(),
  freeItemsCount: z.coerce
    .number()
    .int()
    .min(0, "Free items count must be >= 0")
    .optional(),
});
export type UpdateOfferGroupDto = z.infer<typeof UpdateOfferGroupSchema>;

// ─── OfferGroupItem DTOs ───

export const CreateOfferGroupItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  extraPrice: z.coerce.number().min(0, "Extra price must be >= 0").default(0),
});
export type CreateOfferGroupItemDto = z.infer<
  typeof CreateOfferGroupItemSchema
>;

export const UpdateOfferGroupItemSchema = z.object({
  extraPrice: z.coerce.number().min(0, "Extra price must be >= 0"),
});
export type UpdateOfferGroupItemDto = z.infer<
  typeof UpdateOfferGroupItemSchema
>;

// ─── Price Preview DTOs ───

export const OfferSelectionItemSchema = z.object({
  groupId: z.string().min(1, "Group ID is required"),
  productId: z.string().min(1, "Product ID is required"),
});

export const PricePreviewSchema = z.object({
  offerId: z.string().min(1, "Offer ID is required"),
  selections: z
    .array(OfferSelectionItemSchema)
    .min(1, "At least one selection is required"),
});
export type PricePreviewDto = z.infer<typeof PricePreviewSchema>;

// ─── Add Offer Items to Order ───

export const AddOfferItemsSchema = z.object({
  offerId: z.string().min(1, "Offer ID is required"),
  selections: z
    .array(OfferSelectionItemSchema)
    .min(1, "At least one selection is required"),
});
export type AddOfferItemsDto = z.infer<typeof AddOfferItemsSchema>;

// ─── Response Types ───

export const OfferGroupItemProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
});
export type OfferGroupItemProduct = z.infer<typeof OfferGroupItemProductSchema>;

export const OfferGroupItemSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  offerGroupId: z.string(),
  productId: z.string(),
  extraPrice: z.number(),
  product: OfferGroupItemProductSchema,
});
export type OfferGroupItem = z.infer<typeof OfferGroupItemSchema>;

export const OfferGroupSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  name: z.string(),
  freeItemsCount: z.number(),
  maxItemsCount: z.number(),
  offerGroupItems: z.array(OfferGroupItemSchema),
});
export type OfferGroup = z.infer<typeof OfferGroupSchema>;

export const OfferSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  basePrice: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  offerGroups: z.array(OfferGroupSchema),
  _count: z
    .object({
      offerGroups: z.number(),
    })
    .optional(),
});
export type Offer = z.infer<typeof OfferSchema>;

export const PricePreviewGroupItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  extraPrice: z.number(),
  isFree: z.boolean(),
});
export type PricePreviewGroupItem = z.infer<typeof PricePreviewGroupItemSchema>;

export const PricePreviewGroupSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  freeItemsCount: z.number(),
  items: z.array(PricePreviewGroupItemSchema),
  groupExtras: z.number(),
  freeDiscount: z.number(),
});
export type PricePreviewGroup = z.infer<typeof PricePreviewGroupSchema>;

export const PricePreviewResponseSchema = z.object({
  offerId: z.string(),
  offerName: z.string(),
  isActive: z.boolean(),
  basePrice: z.number(),
  groups: z.array(PricePreviewGroupSchema),
  totalExtras: z.number(),
  totalFreeDiscount: z.number(),
  finalTotal: z.number(),
  isValid: z.boolean(),
  validationErrors: z.array(z.string()),
});
export type PricePreviewResponse = z.infer<typeof PricePreviewResponseSchema>;
