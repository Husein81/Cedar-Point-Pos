import type { PaginationResponse } from "@repo/types";
import { api } from "../lib/api";
import type {
  AvailabilityQuery,
  AvailabilityResult,
  CreateReservationDto,
  Reservation,
  ReservationCalendar,
  ReservationFilters,
  SeatReservationDto,
  UpdateReservationDto,
} from "@/dto/reservation.dto";

export const reservationApi = {
  getReservations: async (
    filters?: ReservationFilters,
  ): Promise<PaginationResponse<Reservation>> => {
    const response = await api.get("/reservations", { params: filters });
    return response.data;
  },

  getReservation: async (id: string): Promise<Reservation> => {
    const response = await api.get<Reservation>(`/reservations/${id}`);
    return response.data;
  },

  getToday: async (branchId?: string): Promise<Reservation[]> => {
    const response = await api.get<Reservation[]>("/reservations/today", {
      params: branchId ? { branchId } : undefined,
    });
    return response.data;
  },

  getUpcoming: async (branchId?: string): Promise<Reservation[]> => {
    const response = await api.get<Reservation[]>("/reservations/upcoming", {
      params: branchId ? { branchId } : undefined,
    });
    return response.data;
  },

  getCalendar: async (
    date: string,
    branchId?: string,
  ): Promise<ReservationCalendar> => {
    const response = await api.get<ReservationCalendar>(
      "/reservations/calendar",
      { params: { date, ...(branchId ? { branchId } : {}) } },
    );
    return response.data;
  },

  checkAvailability: async (
    query: AvailabilityQuery,
  ): Promise<AvailabilityResult> => {
    const response = await api.get<AvailabilityResult>(
      "/reservations/availability",
      { params: query },
    );
    return response.data;
  },

  createReservation: async (
    data: CreateReservationDto,
  ): Promise<Reservation> => {
    const response = await api.post("/reservations", data);
    return response.data;
  },

  updateReservation: async (
    id: string,
    data: UpdateReservationDto,
  ): Promise<Reservation> => {
    const response = await api.patch<Reservation>(`/reservations/${id}`, data);
    return response.data;
  },

  deleteReservation: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/reservations/${id}`);
    return response.data;
  },

  arrive: async (id: string): Promise<Reservation> => {
    const response = await api.post<Reservation>(`/reservations/${id}/arrive`);
    return response.data;
  },

  seat: async (id: string, data?: SeatReservationDto): Promise<Reservation> => {
    const response = await api.post<Reservation>(
      `/reservations/${id}/seat`,
      data ?? {},
    );
    return response.data;
  },

  complete: async (id: string): Promise<Reservation> => {
    const response = await api.post<Reservation>(
      `/reservations/${id}/complete`,
    );
    return response.data;
  },

  cancel: async (id: string, reason?: string): Promise<Reservation> => {
    const response = await api.post<Reservation>(`/reservations/${id}/cancel`, {
      reason,
    });
    return response.data;
  },

  markNoShow: async (id: string): Promise<Reservation> => {
    const response = await api.post<Reservation>(
      `/reservations/${id}/no-show`,
    );
    return response.data;
  },
};
