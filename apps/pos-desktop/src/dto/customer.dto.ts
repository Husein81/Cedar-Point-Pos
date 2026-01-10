export type CustomerSummary = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export type CustomerDetails = CustomerSummary & {
  address: string | null;
  createdAt: string;
  orderCount: number;
};

export type CustomerFullDetails = CustomerDetails & {
  updatedAt: string;
  totalRevenue: number;
  lastOrderAt: string | null;
  averageOrderValue: number;
};

export type CustomerOrder = {
  id: string;
  orderNumber: string | null;
  type: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  discount: string | null;
  createdAt: string;
  completedAt: string | null;
  branch: {
    id: string;
    name: string;
  };
  payments: Array<{
    id: string;
    method: string;
    amount: string;
  }>;
};

export type CreateCustomerDto = {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
};
