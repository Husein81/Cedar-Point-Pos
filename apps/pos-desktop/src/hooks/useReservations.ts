import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "@repo/ui";
import { ACTIVE_RESERVATION_STATUSES } from "@repo/types";
import { reservationApi } from "@/apis/reservationApi";
import type {
  AvailabilityQuery,
  CreateReservationDto,
  Reservation,
  ReservationFilters,
  SeatReservationDto,
  UpdateReservationDto,
} from "@/dto/reservation.dto";

const RESERVATIONS_KEY = ["reservations"];

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) return data.message.join(", ");
    if (data?.message) return data.message;
  }
  return fallback;
};

export const reservationKeys = {
  all: RESERVATIONS_KEY,
  list: (filters?: ReservationFilters) =>
    [...RESERVATIONS_KEY, "list", filters] as const,
  detail: (id: string) => [...RESERVATIONS_KEY, "detail", id] as const,
  today: (branchId?: string) =>
    [...RESERVATIONS_KEY, "today", branchId] as const,
  upcoming: (branchId?: string) =>
    [...RESERVATIONS_KEY, "upcoming", branchId] as const,
  calendar: (date: string, branchId?: string) =>
    [...RESERVATIONS_KEY, "calendar", date, branchId] as const,
  availability: (query: AvailabilityQuery) =>
    [...RESERVATIONS_KEY, "availability", query] as const,
};

/* ------------------------------- Queries -------------------------------- */

export const useReservations = (filters?: ReservationFilters) =>
  useQuery({
    queryKey: reservationKeys.list(filters),
    queryFn: () => reservationApi.getReservations(filters),
  });

export const useReservation = (id: string | null) =>
  useQuery({
    queryKey: reservationKeys.detail(id ?? ""),
    queryFn: () => reservationApi.getReservation(id as string),
    enabled: !!id,
  });

export const useTodayReservations = (branchId?: string) =>
  useQuery({
    queryKey: reservationKeys.today(branchId),
    queryFn: () => reservationApi.getToday(branchId),
  });

export const useUpcomingReservations = (branchId?: string) =>
  useQuery({
    queryKey: reservationKeys.upcoming(branchId),
    queryFn: () => reservationApi.getUpcoming(branchId),
  });

export const useReservationCalendar = (date: string, branchId?: string) =>
  useQuery({
    queryKey: reservationKeys.calendar(date, branchId),
    queryFn: () => reservationApi.getCalendar(date, branchId),
    enabled: !!date,
  });

/**
 * A single table's reservations, newest slot first. Used by the table drawer to
 * show and act on bookings for that table. Not paginated — a table has few
 * reservations at a time.
 */
export const useTableReservations = (tableId: string | null) =>
  useQuery({
    queryKey: reservationKeys.list({ tableId: tableId ?? undefined }),
    queryFn: () =>
      reservationApi.getReservations({
        tableId: tableId as string,
        limit: 50,
        sort: "reservationAt",
        order: "asc",
      }),
    enabled: !!tableId,
    select: (result) => result.data,
  });

/**
 * One-off fetch of a table's soonest active (non-terminal) reservation, for
 * action handlers that need it at click-time (e.g. "Clear Reservation" on the
 * floor plan) without subscribing every table row to a live query.
 */
export const useFetchTableReservation = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (tableId: string): Promise<Reservation | null> => {
      const result = await queryClient.fetchQuery({
        queryKey: reservationKeys.list({ tableId }),
        queryFn: () =>
          reservationApi.getReservations({
            tableId,
            limit: 50,
            sort: "reservationAt",
            order: "asc",
          }),
      });

      const activeStatuses = new Set<string>(ACTIVE_RESERVATION_STATUSES);
      const upcoming = result.data
        .filter((r) => activeStatuses.has(r.status))
        .sort(
          (a, b) =>
            new Date(a.reservationAt).getTime() -
            new Date(b.reservationAt).getTime(),
        );
      return upcoming[0] ?? null;
    },
    [queryClient],
  );
};

/**
 * Availability for a slot. `enabled` is caller-controlled so the query only
 * fires once the form has a branch/date/time (avoids spamming the endpoint on
 * every keystroke).
 */
export const useTableAvailability = (
  query: AvailabilityQuery | null,
  enabled: boolean,
) =>
  useQuery({
    queryKey: reservationKeys.availability(query as AvailabilityQuery),
    queryFn: () => reservationApi.checkAvailability(query as AvailabilityQuery),
    enabled: enabled && !!query,
  });

/* ------------------------------ Mutations ------------------------------- */

/** Invalidate every reservation-derived query after a mutation. */
const useInvalidateReservations = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    // Seating creates/updates orders and occupies tables.
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
  };
};

export const useCreateReservation = () => {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: (data: CreateReservationDto) =>
      reservationApi.createReservation(data),
    onSuccess: (reservation) => {
      toast.success(`Reservation ${reservation.reservationNumber} created`);
      invalidate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create reservation"));
    },
  });
};

export const useUpdateReservation = () => {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReservationDto }) =>
      reservationApi.updateReservation(id, data),
    onSuccess: () => {
      toast.success("Reservation updated");
      invalidate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update reservation"));
    },
  });
};

export const useDeleteReservation = () => {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: (id: string) => reservationApi.deleteReservation(id),
    onSuccess: () => {
      toast.success("Reservation deleted");
      invalidate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to delete reservation"));
    },
  });
};

export const useArriveReservation = () => {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: (id: string) => reservationApi.arrive(id),
    onSuccess: () => {
      toast.success("Guest marked as arrived");
      invalidate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update reservation"));
    },
  });
};

export const useSeatReservation = () => {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: SeatReservationDto }) =>
      reservationApi.seat(id, data),
    onSuccess: (reservation) => {
      toast.success(
        reservation.order?.orderNumber
          ? `Seated — order ${reservation.order.orderNumber} opened`
          : "Reservation seated",
      );
      invalidate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to seat reservation"));
    },
  });
};

export const useCompleteReservation = () => {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: (id: string) => reservationApi.complete(id),
    onSuccess: () => {
      toast.success("Reservation completed");
      invalidate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to complete reservation"));
    },
  });
};

export const useCancelReservation = () => {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      reservationApi.cancel(id, reason),
    onSuccess: () => {
      toast.success("Reservation cancelled");
      invalidate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to cancel reservation"));
    },
  });
};

export const useMarkNoShow = () => {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: (id: string) => reservationApi.markNoShow(id),
    onSuccess: () => {
      toast.success("Marked as no-show");
      invalidate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update reservation"));
    },
  });
};
