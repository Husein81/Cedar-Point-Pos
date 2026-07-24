import { toast } from "@repo/ui";
import { useMutation } from "@tanstack/react-query";
import { mediaApi, type UploadImageResult } from "../apis/mediaApi";

/**
 * Uploads a product image through the API (which stores it in B2) and returns
 * the storage key + public URL. Surfaces a toast on failure so callers can
 * simply bail out of their submit flow.
 */
export const useUploadProductImage = () => {
  return useMutation<UploadImageResult, Error, File>({
    mutationFn: mediaApi.uploadProductImage,
    onError: () => {
      toast.error("Failed to upload image. Please try again.");
    },
  });
};

/**
 * Uploads a tenant logo through the API (stored in B2) and returns the storage
 * key + public URL. Surfaces a toast on failure so callers can bail out.
 */
export const useUploadTenantLogo = () => {
  return useMutation<UploadImageResult, Error, File>({
    mutationFn: mediaApi.uploadTenantLogo,
    onError: () => {
      toast.error("Failed to upload logo. Please try again.");
    },
  });
};
