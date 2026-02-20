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
  freeItemsCount: z.coerce
    .number()
    .int()
    .min(0, "Free items count must be >= 0")
    .default(0),
});
export type CreateOfferGroupDto = z.infer<typeof CreateOfferGroupSchema>;

export const UpdateOfferGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
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
  extraPrice: z.coerce
    .number()
    .min(0, "Extra price must be >= 0")
    .default(0),
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

export type OfferGroupItemProduct = {
  id: string;
  name: string;
  price: number;
};

export type OfferGroupItem = {
  id: string;
  offerId: string;
  offerGroupId: string;
  productId: string;
  extraPrice: number;
  product: OfferGroupItemProduct;
};

export type OfferGroup = {
  id: string;
  offerId: string;
  name: string;
  freeItemsCount: number;
  offerGroupItems: OfferGroupItem[];
};

export type Offer = {
  id: string;
  tenantId: string;
  name: string;
  basePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  offerGroups: OfferGroup[];
  _count?: {
    offerGroups: number;
  };
};

export type PricePreviewGroupItem = {
  productId: string;
  productName: string;
  extraPrice: number;
  isFree: boolean;
};

export type PricePreviewGroup = {
  groupId: string;
  groupName: string;
  freeItemsCount: number;
  items: PricePreviewGroupItem[];
  groupExtras: number;
  freeDiscount: number;
};

export type PricePreviewResponse = {
  offerId: string;
  offerName: string;
  isActive: boolean;
  basePrice: number;
  groups: PricePreviewGroup[];
  totalExtras: number;
  totalFreeDiscount: number;
  finalTotal: number;
  isValid: boolean;
  validationErrors: string[];
};
