export type CustomerSummary = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export type CustomerDetails = CustomerSummary & {
  address: string | null;
  createdAt: string;
  orderCount: number;
}

export type CreateCustomerDto = {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}
