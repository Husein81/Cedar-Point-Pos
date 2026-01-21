// ==========================================
// DTOs for Currency Operations
// ==========================================

export interface CreateTenantCurrencyDto {
  currencyCode: string;
  exchangeRate: number | string;
  isActive?: boolean;
}

export interface UpdateTenantCurrencyDto {
  exchangeRate?: number | string;
  isActive?: boolean;
}

export interface SetBaseCurrencyResponse {
  id: string;
  baseCurrencyCode: string;
}
