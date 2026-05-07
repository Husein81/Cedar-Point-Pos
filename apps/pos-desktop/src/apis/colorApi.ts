import type { Color } from "@repo/types";
import { api } from "./api";

export const getColors = async (): Promise<Color[]> => {
  const response = await api.get("/colors");
  return response.data;
};

export const createColor = async (
  data: Omit<Color, "id" | "tenantId">,
): Promise<Color> => {
  const response = await api.post("/colors", data);
  return response.data;
};

export const updateColor = async (
  id: string,
  data: Partial<Omit<Color, "id" | "tenantId">>,
): Promise<Color> => {
  const response = await api.put(`/colors/${id}`, data);
  return response.data;
};

export const deleteColor = async (id: string): Promise<void> => {
  await api.delete(`/colors/${id}`);
};

export const seedColors = async (): Promise<void> => {
  await api.post("/colors/seed");
};
