import { api } from "./api";

export interface POSDeviceListItem {
  id: string;
  name: string;
  branchId: string;
  isActive: boolean;
  isKDS: boolean;
}

export interface CreatePOSDeviceDto {
  name: string;
  branchId: string;
  isKDS?: boolean;
}

export const devicesApi = {
  getDevices: async (branchId?: string): Promise<POSDeviceListItem[]> => {
    const response = await api.get<POSDeviceListItem[]>("/devices", {
      params: branchId ? { branchId } : undefined,
    });
    return response.data;
  },
  createDevice: async (
    data: CreatePOSDeviceDto,
  ): Promise<POSDeviceListItem> => {
    const response = await api.post<POSDeviceListItem>("/devices", data);
    return response.data;
  },
};
