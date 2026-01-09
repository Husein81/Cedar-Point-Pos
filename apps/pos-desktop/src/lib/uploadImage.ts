import { supabase } from "./supabse";

export interface UploadImageResult {
  url: string;
  path: string;
}

export const uploadProductImage = async (
  file: File,
  productId?: string
): Promise<UploadImageResult> => {
  try {
    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${productId || Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from("products")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    throw new Error("Failed to upload image");
  }
};

export const deleteProductImage = async (path: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from("products")
      .remove([path]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw new Error("Failed to delete image");
  }
};
