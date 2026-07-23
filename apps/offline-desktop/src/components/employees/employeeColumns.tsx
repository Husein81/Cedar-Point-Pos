import type { ColumnDef } from "@tanstack/react-table";
import { Badge, Button } from "@repo/ui";
import { formatDate } from "@/utils/format";
import type { User } from "@/shared/models";

type Handlers = {
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
};

export const getEmployeeColumns = ({
  onEdit,
  onDeactivate,
}: Handlers): ColumnDef<User>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.username}</span>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            iconName="Pencil"
            onClick={() => onEdit(user)}
          />
          {user.isActive && (
            <Button
              variant="ghost"
              size="icon-sm"
              iconName="UserX"
              onClick={() => onDeactivate(user)}
            />
          )}
        </div>
      );
    },
  },
];
