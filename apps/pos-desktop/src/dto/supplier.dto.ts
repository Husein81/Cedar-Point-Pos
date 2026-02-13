export type SupplierSummary = {
  id: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
};

export type SupplierDetails = SupplierSummary & {
  address: string | null;
  category: string | null;
  currentBalance: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    purchaseOrders: number;
  };
};

export type SupplierFullDetails = Omit<SupplierDetails, "_count"> & {
  totalOrders: number;
  totalPurchaseAmount: number;
  averagePurchaseValue: number;
  lastPurchaseDate: string | null;
  lastPurchaseAmount: number | null;
};

export type SupplierPurchaseOrder = {
  id: string;
  orderNumber: string | null;
  totalAmount: number;
  status: string;
  notes: string | null;
  orderedAt: string;
  receivedAt: string | null;
  branch: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    quantity: string;
    unitCost: string;
    totalCost: string;
    product: {
      id: string;
      name: string;
      sku: string | null;
      barcode: string | null;
    };
  }>;
};

export type CreateSupplierDto = {
  name: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  category?: string | null;
  notes?: string | null;
};

export type UpdateSupplierDto = Partial<CreateSupplierDto> & {
  currentBalance?: number;
};
