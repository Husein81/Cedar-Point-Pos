import { StaffActions } from "@/components/staff/StaffActions";
import { ROLE_LABELS } from "@/constants/staff";
import { DEFAULT_LOCALE } from "@/constants/locale";
import type { StaffView } from "@/dto/staff.dto";
import { getInitials } from "@/utils/getInitials";
import { Avatar, Badge, Icon } from "@repo/ui";
import { ColumnDef } from "@tanstack/react-table";

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(DEFAULT_LOCALE, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never";

export const getStaffColumns = (): ColumnDef<StaffView>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const staff = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar
            fallback={getInitials(staff.name)}
            className="h-9 w-9 bg-primary/10 text-primary"
          />
          <div>
            <div className="font-medium">{staff.name}</div>
            <div className="text-xs text-muted-foreground">
              @{staff.username}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant="secondary">{ROLE_LABELS[row.original.role]}</Badge>
    ),
  },
  {
    id: "branch",
    header: "Branch",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.branch?.name ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge className="bg-green-500">Active</Badge>
      ) : (
        <Badge variant="outline">Inactive</Badge>
      ),
  },
  {
    accessorKey: "hasPosAccess",
    header: "POS",
    cell: ({ row }) =>
      row.original.hasPosAccess ? (
        <Icon name="Check" className="h-4 w-4 text-green-600" />
      ) : (
        <Icon name="Minus" className="h-4 w-4 text-muted-foreground" />
      ),
  },
  {
    accessorKey: "isPinSet",
    header: "PIN",
    cell: ({ row }) =>
      row.original.isPinSet ? (
        <Icon name="KeyRound" className="h-4 w-4 text-green-600" />
      ) : (
        <Icon name="Minus" className="h-4 w-4 text-muted-foreground" />
      ),
  },
  {
    accessorKey: "lastLoginAt",
    header: "Last Login",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.lastLoginAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <StaffActions staff={row.original} />,
  },
];
