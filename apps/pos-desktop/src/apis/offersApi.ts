import type { PaginationResponse, QueryParams } from "@repo/types";
import { api } from "../lib/api";
import type {
  Offer,
  CreateOfferDto,
  UpdateOfferDto,
  CreateOfferGroupDto,
  UpdateOfferGroupDto,
  CreateOfferGroupItemDto,
  UpdateOfferGroupItemDto,
  PricePreviewDto,
  PricePreviewResponse,
  AddOfferItemsDto,
} from "@/dto/offers.dto";

export const offersApi = {
  // ─── Offer CRUD ───

  getOffersPaginated: async (
    params?: QueryParams,
  ): Promise<PaginationResponse<Offer>> => {
    const response = await api.get("/offers", { params });
    console.log("Res", response.data);
    return response.data;
  },

  getActiveOffers: async (
    params?: QueryParams,
  ): Promise<PaginationResponse<Offer>> => {
    const response = await api.get("/offers/active", { params });
    return response.data;
  },

  getOffer: async (id: string): Promise<Offer> => {
    const response = await api.get(`/offers/${id}`);
    return response.data;
  },

  createOffer: async (data: CreateOfferDto): Promise<Offer> => {
    const response = await api.post<Offer>("/offers", data);
    return response.data;
  },

  updateOffer: async (id: string, data: UpdateOfferDto): Promise<Offer> => {
    const response = await api.put<Offer>(`/offers/${id}`, data);
    return response.data;
  },

  deleteOffer: async (id: string): Promise<void> => {
    await api.delete(`/offers/${id}`);
  },

  // ─── OfferGroup CRUD ───

  createOfferGroup: async (
    offerId: string,
    data: CreateOfferGroupDto,
  ): Promise<Offer> => {
    const response = await api.post<Offer>(`/offers/${offerId}/groups`, data);
    return response.data;
  },

  updateOfferGroup: async (
    offerId: string,
    groupId: string,
    data: UpdateOfferGroupDto,
  ): Promise<Offer> => {
    const response = await api.put<Offer>(
      `/offers/${offerId}/groups/${groupId}`,
      data,
    );
    return response.data;
  },

  deleteOfferGroup: async (offerId: string, groupId: string): Promise<void> => {
    await api.delete(`/offers/${offerId}/groups/${groupId}`);
  },

  // ─── OfferGroupItem CRUD ───

  addOfferGroupItem: async (
    offerId: string,
    groupId: string,
    data: CreateOfferGroupItemDto,
  ): Promise<Offer> => {
    const response = await api.post<Offer>(
      `/offers/${offerId}/groups/${groupId}/items`,
      data,
    );
    return response.data;
  },

  updateOfferGroupItem: async (
    offerId: string,
    groupId: string,
    itemId: string,
    data: UpdateOfferGroupItemDto,
  ): Promise<Offer> => {
    const response = await api.put<Offer>(
      `/offers/${offerId}/groups/${groupId}/items/${itemId}`,
      data,
    );
    return response.data;
  },

  removeOfferGroupItem: async (
    offerId: string,
    groupId: string,
    itemId: string,
  ): Promise<void> => {
    await api.delete(`/offers/${offerId}/groups/${groupId}/items/${itemId}`);
  },

  // ─── Pricing ───

  pricePreview: async (
    data: PricePreviewDto,
  ): Promise<PricePreviewResponse> => {
    const response = await api.post<PricePreviewResponse>(
      "/offers/price-preview",
      data,
    );
    return response.data;
  },

  // ─── Order Integration ───

  addOfferItemsToOrder: async (
    orderId: string,
    data: AddOfferItemsDto,
  ): Promise<unknown> => {
    const response = await api.post(
      `/orders/${orderId}/items/from-offer`,
      data,
    );
    return response.data;
  },
};
