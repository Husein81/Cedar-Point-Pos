import {
  getStaffActivityColumns,
  humanize,
} from "@/constants/columns/staffActivityColumn";
import { useStaffActivity } from "@/hooks/useStaff";
import { StaffActivityModule } from "@repo/types";
import type { StaffActivityQuery } from "@repo/types";
import { Button, DataTable, DatePicker, Empty, Select, toast } from "@repo/ui";
import { useEffect, useState } from "react";

const ALL = "ALL";
const PAGE_SIZE = 10;

const moduleOptions = [
  { value: ALL, label: "All modules" },
  ...Object.values(StaffActivityModule).map((module) => ({
    value: module,
    label: humanize(module),
  })),
];

export const StaffActivityLog = ({ staffId }: { staffId: string }) => {
  const [module, setModule] = useState(ALL);
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [page, setPage] = useState(1);

  const query: StaffActivityQuery = {
    page,
    limit: PAGE_SIZE,
    module: module === ALL ? undefined : module,
    from,
    to,
  };

  const { data, isLoading, isError } = useStaffActivity(staffId, query);

  // Queries don't toast on their own — surface load failures.
  useEffect(() => {
    if (isError) {
      toast.error("Failed to load activity log");
    }
  }, [isError]);

  const hasFilters = module !== ALL || !!from || !!to;
  const clearFilters = () => {
    setModule(ALL);
    setFrom(undefined);
    setTo(undefined);
    setPage(1);
  };

  const isEmpty = !isLoading && (data?.data.length ?? 0) === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Activity Log</h2>
        <p className="text-sm text-muted-foreground">
          {data?.pagination?.totalCount ?? 0} recorded actions
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          options={moduleOptions}
          value={module}
          onChange={(opt) => {
            setModule(opt.value);
            setPage(1);
          }}
          placeholder="All modules"
          className="w-44"
        />
        <DatePicker
          label="From"
          date={from}
          open={fromOpen}
          onOpenChange={setFromOpen}
          onDateChange={(date) => {
            setFrom(date);
            setPage(1);
          }}
        />
        <DatePicker
          label="To"
          date={to}
          open={toOpen}
          onOpenChange={setToOpen}
          onDateChange={(date) => {
            setTo(date);
            setPage(1);
          }}
        />
        {hasFilters && (
          <Button variant="ghost" iconName="X" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {isEmpty ? (
        <Empty
          icon="Activity"
          title="No activity"
          description="No recorded actions match these filters yet."
        />
      ) : (
        <DataTable
          isLoading={isLoading}
          columns={getStaffActivityColumns()}
          data={data?.data ?? []}
          pagination={
            data?.pagination
              ? {
                  rows: data.pagination.totalCount,
                  page,
                  pageSize: PAGE_SIZE,
                  totalPages: data.pagination.totalPages,
                  onPageChange: setPage,
                  onPageSizeChange: () => {},
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
