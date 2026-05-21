import { offersApi } from "@/apis/offersApi";
import type {
  CreateOfferDto,
  UpdateOfferDto,
  CreateOfferGroupDto,
  UpdateOfferGroupDto,
  CreateOfferGroupItemDto,
  UpdateOfferGroupItemDto,
  PricePreviewDto,
  PricePreviewResponse,
  Offer,
  AddOfferItemsDto,
} from "@/dto/offers.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";

const OFFER_QUERY_KEY = ["offers"];
const ORDER_QUERY_KEY = ["orders"];

// ─── Queries ───

export const useOffersPaginated = (params?: QueryParams) => {
  return useQuery({
    queryKey: [...OFFER_QUERY_KEY, "paginated", params],
    queryFn: () => offersApi.getOffersPaginated(params),
  });
};

export const useActiveOffers = (params?: QueryParams) => {
  return useQuery<PaginationResponse<Offer>>({
    queryKey: [...OFFER_QUERY_KEY, "active", params],
    queryFn: () => offersApi.getActiveOffers(params),
  });
};

export const useOffer = (id: string) => {
  return useQuery<Offer>({
    queryKey: [...OFFER_QUERY_KEY, id],
    queryFn: () => offersApi.getOffer(id),
    enabled: !!id,
  });
};

// ─── Offer Mutations ───

export const useCreateOffer = () => {
  const queryClient = useQueryClient();

  return useMutation<Offer, Error, CreateOfferDto>({
    mutationFn: offersApi.createOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Offer created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create offer");
    },
  });
};

export const useUpdateOffer = () => {
  const queryClient = useQueryClient();

  return useMutation<Offer, Error, { id: string; data: UpdateOfferDto }>({
    mutationFn: ({ id, data }) => offersApi.updateOffer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Offer updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update offer");
    },
  });
};

export const useDeleteOffer = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: offersApi.deleteOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Offer deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete offer");
    },
  });
};

// ─── OfferGroup Mutations ───

export const useCreateOfferGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Offer,
    Error,
    { offerId: string; data: CreateOfferGroupDto }
  >({
    mutationFn: ({ offerId, data }) =>
      offersApi.createOfferGroup(offerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Group created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create group");
    },
  });
};

export const useUpdateOfferGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Offer,
    Error,
    { offerId: string; groupId: string; data: UpdateOfferGroupDto }
  >({
    mutationFn: ({ offerId, groupId, data }) =>
      offersApi.updateOfferGroup(offerId, groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Group updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update group");
    },
  });
};

export const useDeleteOfferGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { offerId: string; groupId: string }>({
    mutationFn: ({ offerId, groupId }) =>
      offersApi.deleteOfferGroup(offerId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Group deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete group");
    },
  });
};

// ─── OfferGroupItem Mutations ───

export const useAddOfferGroupItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Offer,
    Error,
    { offerId: string; groupId: string; data: CreateOfferGroupItemDto }
  >({
    mutationFn: ({ offerId, groupId, data }) =>
      offersApi.addOfferGroupItem(offerId, groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Product added to group");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add product");
    },
  });
};

export const useUpdateOfferGroupItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Offer,
    Error,
    {
      offerId: string;
      groupId: string;
      itemId: string;
      data: UpdateOfferGroupItemDto;
    }
  >({
    mutationFn: ({ offerId, groupId, itemId, data }) =>
      offersApi.updateOfferGroupItem(offerId, groupId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Item updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update item");
    },
  });
};

export const useRemoveOfferGroupItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { offerId: string; groupId: string; itemId: string }
  >({
    mutationFn: ({ offerId, groupId, itemId }) =>
      offersApi.removeOfferGroupItem(offerId, groupId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Product removed from group");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove product");
    },
  });
};

// ─── Pricing ───

export const usePricePreview = () => {
  return useMutation<PricePreviewResponse, Error, PricePreviewDto>({
    mutationFn: offersApi.pricePreview,
  });
};

// ─── Order Integration ───

export const useAddOfferItems = () => {
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    Error,
    { orderId: string; data: AddOfferItemsDto }
  >({
    mutationFn: ({ orderId, data }) =>
      offersApi.addOfferItemsToOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: OFFER_QUERY_KEY });
      toast.success("Offer items added to order");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add offer items");
    },
  });
};
