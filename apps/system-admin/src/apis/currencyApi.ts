import type { Currency } from "@repo/types";
import { api } from "./api";

export interface CreateCurrencyPayload {
  code: string;
  name: string;
  symbol?: string;
  decimalPlaces?: number;
}

export interface UpdateCurrencyPayload {
  name?: string;
  symbol?: string;
  decimalPlaces?: number;
}

export const currencyApi = {
  /**
   * Get all currencies from the global reference table
   */
  getAll: async (): Promise<Currency[]> => {
    return api("/currencies/reference/all");
  },

  /**
   * Get a single currency by code
   */
  getByCode: async (code: string): Promise<Currency> => {
    return api(`/currencies/reference/${code}`);
  },

  /**
   * Create a new currency in the reference table (System Admin only)
   */
  create: async (payload: CreateCurrencyPayload): Promise<Currency> => {
    return api("/currencies/reference", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        code: payload.code.toUpperCase(),
      }),
    });
  },

  /**
   * Update a currency in the reference table (System Admin only)
   */
  update: async (
    code: string,
    payload: UpdateCurrencyPayload
  ): Promise<Currency> => {
    return api(`/currencies/reference/${code}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
