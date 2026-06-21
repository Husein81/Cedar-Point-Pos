import { api } from "./api";

export interface UploadImageResult {
  /** Durable storage object key, persisted on the product as `imageKey`. */
  key: string;
  /** Derived public (CDN) URL for immediate display. */
  url: string;
}

export const mediaApi = {
  uploadProductImage: async (file: File): Promise<UploadImageResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<UploadImageResult>(
      "/media/products/image",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },
};
