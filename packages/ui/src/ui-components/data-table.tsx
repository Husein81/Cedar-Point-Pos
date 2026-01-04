import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Input, Shad } from "../components";
import Pagination from "./pagination";
import { Button } from "./button";
import { TableSkeleton } from "./table-skeleton";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  search?: {
    term?: string; // controlled applied term
    onTermChange?: (term: string) => void;
    keys: (keyof TData)[];
  };
  isLoading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
};

export function DataTable<TData, TValue>({
  columns,
  data,
  search,
  isLoading,
  pagination,
}: DataTableProps<TData, TValue>) {
  // 🔹 internal fallback state
  const [internalTerm, setInternalTerm] = useState("");
  const [inputValue, setInputValue] = useState("");

  const appliedTerm = search?.term ?? internalTerm;

  /**
   * 🔍 Filter data (only when appliedTerm changes)
   */
  const filteredData = useMemo(() => {
    if (!search || !appliedTerm.trim()) return data;

    const query = appliedTerm.toLowerCase();

    return data.filter((row) =>
      search.keys.some((key) => {
        const value = row[key];
        return typeof value === "string" && value.toLowerCase().includes(query);
      })
    );
  }, [data, search, appliedTerm]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  /**
   * 🔎 Apply search
   */
  const applySearch = () => {
    if (search?.onTermChange) {
      search.onTermChange(inputValue);
    } else setInternalTerm(inputValue);

    pagination?.onPageChange(1);
  };

  return (
    <>
      {/* 🔍 Search bar */}
      {search && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applySearch();
              }
            }}
            className="max-w-sm"
          />

          <Button iconName="Search" onClick={applySearch}>
            Search
          </Button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Shad.Table>
            <Shad.TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <Shad.TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Shad.TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </Shad.TableHead>
                  ))}
                </Shad.TableRow>
              ))}
            </Shad.TableHeader>

            <Shad.TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <Shad.TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Shad.TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </Shad.TableCell>
                    ))}
                  </Shad.TableRow>
                ))
              ) : (
                <Shad.TableRow>
                  <Shad.TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </Shad.TableCell>
                </Shad.TableRow>
              )}
            </Shad.TableBody>
          </Shad.Table>
        </div>
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </>
  );
}
