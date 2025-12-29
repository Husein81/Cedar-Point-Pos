"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Category } from "@repo/types";

export const categoryColumns: ColumnDef<Category>[] = [
  {
    accessorKey: "name",
    header: "Category Name",
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) =>
      row.original.description || (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "isDeleted",
    header: "Status",
    cell: ({ row }) =>
      row.original.isDeleted ? (
        <span className="text-red-600 text-sm">Inactive</span>
      ) : (
        <span className="text-green-600 text-sm">Active</span>
      ),
  },
];
