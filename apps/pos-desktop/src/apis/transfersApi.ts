import { api } from "../lib/api";
import type { PaginationResponse, QueryParams } from "@repo/types";

export interface CreateTransferItemDto {
  productId: string;
  quantity: number;
}

export interface CreateTransferDto {
  fromBranchId: string;
  toBranchId: string;
  items: CreateTransferItemDto[];
  notes?: string;
}

export interface UpdateTransferDto {
  status?: string;
  notes?: string;
}

export interface TransferQuery extends QueryParams {
  status?: string;
  fromBranchId?: string;
  toBranchId?: string;
}

export interface TransferItemWithProduct {
  id: string;
  transferId: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
  };
}

export interface TransferWithDetails {
  id: string;
  tenantId: string;
  fromBranchId: string;
  toBranchId: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  requestedBy: string;
  approvedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  items: TransferItemWithProduct[];
  fromBranch?: { id: string; name: string };
  toBranch?: { id: string; name: string };
  requestor?: { id: string; name: string; username: string };
  approver?: { id: string; name: string; username: string } | null;
}

export const transfersApi = {
  getTransfers: async (
    query: TransferQuery
  ): Promise<PaginationResponse<TransferWithDetails>> => {
    const response = await api.get<PaginationResponse<TransferWithDetails>>(
      "/transfers",
      { params: query }
    );
    return response.data;
  },

  getTransfer: async (id: string): Promise<TransferWithDetails> => {
    const response = await api.get<TransferWithDetails>(`/transfers/${id}`);
    return response.data;
  },

  createTransfer: async (data: CreateTransferDto): Promise<TransferWithDetails> => {
    const response = await api.post<TransferWithDetails>("/transfers", data);
    return response.data;
  },

  completeTransfer: async (id: string): Promise<TransferWithDetails> => {
    const response = await api.post<TransferWithDetails>(
      `/transfers/${id}/complete`
    );
    return response.data;
  },

  cancelTransfer: async (id: string): Promise<TransferWithDetails> => {
    const response = await api.post<TransferWithDetails>(
      `/transfers/${id}/cancel`
    );
    return response.data;
  },

  updateTransfer: async (
    id: string,
    data: UpdateTransferDto
  ): Promise<TransferWithDetails> => {
    const response = await api.patch<TransferWithDetails>(
      `/transfers/${id}`,
      data
    );
    return response.data;
  },
};
