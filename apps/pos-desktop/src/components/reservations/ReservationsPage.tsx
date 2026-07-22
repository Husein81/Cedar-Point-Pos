import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button, DataTable, DatePicker, Icon, Shad } from "@repo/ui";
import { ReservationStatus } from "@repo/types";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import {
  useReservationCalendar,
  useReservations,
  useTodayReservations,
  useUpcomingReservations,
} from "@/hooks/useReservations";
import { useReservationsSocket } from "@/hooks/useReservationsSocket";
import type { Reservation } from "@/dto/reservation.dto";
import { getReservationColumns } from "./reservationColumns";
import { ReservationForm } from "./ReservationForm";
import { ReservationDetailsDrawer } from "./ReservationDetailsDrawer";
import { ReservationCalendar } from "./ReservationCalendar";

type TabKey = "today" | "upcoming" | "calendar" | "history" | "cancelled";

const PAGE_SIZE = 20;

const toDateInput = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const ReservationsPage = () => {
  const branchId = useBranchStore((s) => s.branchId);
  const openModal = useModalStore((s) => s.openModal);
  useReservationsSocket(branchId);

  const [tab, setTab] = useState<TabKey>("today");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);

  const branchFilter = branchId || undefined;

  // Queries per tab (only the active tab's query does real work via `enabled`
  // is unnecessary here — TanStack keeps others cached and they're cheap).
  const todayQuery = useTodayReservations(branchFilter);
  const upcomingQuery = useUpcomingReservations(branchFilter);
  const historyQuery = useReservations({
    branchId: branchFilter,
    status: ReservationStatus.COMPLETED,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
    sort: "reservationAt",
    order: "desc",
  });
  const cancelledQuery = useReservations({
    branchId: branchFilter,
    status: ReservationStatus.CANCELLED,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
    sort: "reservationAt",
    order: "desc",
  });
  const calendarQuery = useReservationCalendar(
    toDateInput(calendarDate),
    branchFilter,
  );

  const openCreate = () => openModal("New Reservation", <ReservationForm />);

  const openEdit = (reservation: Reservation) => {
    setDrawerOpen(false);
    openModal(
      "Edit Reservation",
      <ReservationForm reservation={reservation} />,
    );
  };

  const openDetails = (reservation: Reservation) => {
    setSelected(reservation);
    setDrawerOpen(true);
  };

  const columns = useMemo<ColumnDef<Reservation>[]>(
    () => getReservationColumns({ onView: openDetails, onEdit: openEdit }),
    // openEdit/openDetails are stable enough for this table's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const renderTable = (
    data: Reservation[],
    isLoading: boolean,
    onRefetch: () => void,
    pagination?: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    },
  ) => (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRefetch={onRefetch}
      search={{
        term: search,
        onTermChange: (term) => {
          setSearch(term);
          setPage(1);
        },
        keys: ["reservationNumber", "customerName", "customerPhone"],
      }}
      pagination={
        pagination
          ? {
              rows: pagination.totalCount,
              page: pagination.page,
              pageSize: pagination.limit,
              totalPages: pagination.totalPages,
              onPageChange: setPage,
              onPageSizeChange: () => {},
            }
          : undefined
      }
    />
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Reservations</h1>
          <p className="text-sm text-muted-foreground">
            Manage bookings, seating and the day schedule.
          </p>
        </div>
        <Button onClick={openCreate} iconName="Plus">
          New Reservation
        </Button>
      </div>

      <div className="p-6">
        <Shad.Tabs
          value={tab}
          className="flex flex-col gap-4"
          onValueChange={(value) => {
            setTab(value as TabKey);
            setPage(1);
          }}
        >
          <Shad.TabsList>
            <Shad.TabsTrigger value="today">Today</Shad.TabsTrigger>
            <Shad.TabsTrigger value="upcoming">Upcoming</Shad.TabsTrigger>
            <Shad.TabsTrigger value="calendar">Calendar</Shad.TabsTrigger>
            <Shad.TabsTrigger value="history">History</Shad.TabsTrigger>
            <Shad.TabsTrigger value="cancelled">Cancelled</Shad.TabsTrigger>
          </Shad.TabsList>

          <Shad.TabsContent value="today" className="mt-4">
            {renderTable(
              todayQuery.data ?? [],
              todayQuery.isLoading,
              todayQuery.refetch,
            )}
          </Shad.TabsContent>

          <Shad.TabsContent value="upcoming" className="mt-4">
            {renderTable(
              upcomingQuery.data ?? [],
              upcomingQuery.isLoading,
              upcomingQuery.refetch,
            )}
          </Shad.TabsContent>

          <Shad.TabsContent value="calendar" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <DatePicker
                open={calendarPickerOpen}
                onOpenChange={setCalendarPickerOpen}
                date={calendarDate}
                onDateChange={(d) => d && setCalendarDate(d)}
              />
              <Button
                variant="outline"
                size="sm"
                iconName="RefreshCw"
                onClick={() => calendarQuery.refetch()}
              >
                Refresh
              </Button>
            </div>
            <ReservationCalendar
              data={calendarQuery.data}
              isLoading={calendarQuery.isLoading}
              onSelect={openDetails}
            />
          </Shad.TabsContent>

          <Shad.TabsContent value="history" className="mt-4">
            {renderTable(
              historyQuery.data?.data ?? [],
              historyQuery.isLoading,
              historyQuery.refetch,
              historyQuery.data?.pagination,
            )}
          </Shad.TabsContent>

          <Shad.TabsContent value="cancelled" className="mt-4">
            {renderTable(
              cancelledQuery.data?.data ?? [],
              cancelledQuery.isLoading,
              cancelledQuery.refetch,
              cancelledQuery.data?.pagination,
            )}
          </Shad.TabsContent>
        </Shad.Tabs>
      </div>

      <ReservationDetailsDrawer
        reservation={selected}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelected(null);
        }}
        onEdit={openEdit}
      />

      {!branchId && (
        <div className="mx-6 mb-6 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <Icon name="TriangleAlert" size={16} />
          No branch selected — reservations are scoped to the active branch.
        </div>
      )}
    </>
  );
};
