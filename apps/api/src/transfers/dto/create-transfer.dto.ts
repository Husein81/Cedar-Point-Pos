export type TransferItemDto = {
  productId: string;
  quantity: number;
};

export type CreateTransferDto = {
  fromBranchId: string;
  toBranchId: string;
  items: TransferItemDto[];
  notes?: string;
};
