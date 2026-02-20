import { z } from 'zod';

const offerSelectionItemSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
});

export const addOfferItemsSchema = z.object({
  offerId: z.string().min(1, 'Offer ID is required'),
  selections: z
    .array(offerSelectionItemSchema)
    .min(1, 'At least one selection is required'),
});
export type AddOfferItemsDto = z.infer<typeof addOfferItemsSchema>;
