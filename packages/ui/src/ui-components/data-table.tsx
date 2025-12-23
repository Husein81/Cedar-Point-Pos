import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Shad } from "../components";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
};

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-md border">
      <Shad.Table>
        <Shad.TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <Shad.TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <Shad.TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </Shad.TableHead>
                );
              })}
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
  );
}
