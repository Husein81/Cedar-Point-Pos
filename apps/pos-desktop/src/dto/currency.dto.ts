import { z } from "zod";

const CreateTenantCurrencySchema = z.object({
  currencyCode: z.string(),
  exchangeRate: z.union([z.number(), z.string()]),
  isActive: z.boolean().optional(),
});
export type CreateTenantCurrencyDto = z.infer<
  typeof CreateTenantCurrencySchema
>;

const UpdateTenantCurrencySchema = z.object({
  exchangeRate: z.union([z.number(), z.string()]).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateTenantCurrencyDto = z.infer<
  typeof UpdateTenantCurrencySchema
>;

const SetBaseCurrencyResponseSchema = z.object({
  id: z.string(),
  baseCurrencyCode: z.string(),
});
export type SetBaseCurrencyResponse = z.infer<
  typeof SetBaseCurrencyResponseSchema
>;
