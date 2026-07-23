"use client";

import { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/Header";
import { useTenants } from "@/hooks/tenant";
import { DataTable, Button, Shad, Icon } from "@repo/ui";
import type { TenantWithCount } from "@/types/tenant";
import type { BusinessType } from "@repo/types";
import {
  CreateTenantDialog,
  CreateUserDialog,
  TenantUsersDialog,
  DeleteTenantDialog,
  EditTenantDialog,
  TenantBranchesDialog,
} from "@/components/tenants";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getBusinessTypeBadge = (type: BusinessType) => {
  switch (type) {
    case "RESTAURANT":
      return "bg-orange-100 text-orange-800";
    case "RETAIL":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function TenantsPage() {
  const { data: tenants = [], isLoading, refetch } = useTenants();

  // Dialog states
  const [createTenantOpen, setCreateTenantOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithCount | null>(
    null
  );
  const [viewUsersOpen, setViewUsersOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTenantOpen, setEditTenantOpen] = useState(false);
  const [viewBranchesOpen, setViewBranchesOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Table columns
  const columns: ColumnDef<TenantWithCount>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: "code",
        header: "Login Code",
        cell: ({ row }) =>
          row.original.code ? (
            <span className="rounded bg-muted px-2 py-1 font-mono text-xs">
              {row.original.code}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Not set</span>
          ),
      },
      {
        accessorKey: "businessType",
        header: "Business Type",
        cell: ({ row }) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getBusinessTypeBadge(row.original.businessType)}`}
          >
            {row.original.businessType}
          </span>
        ),
      },
      {
        accessorKey: "_count.users",
        header: "Users",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Icon name="Users" size={14} className="text-muted-foreground" />
            <span>{row.original._count.users || 0}</span>
          </div>
        ),
      },
      {
        accessorKey: "_count.branches",
        header: "Branches",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Icon
              name="Building2"
              size={14}
              className="text-muted-foreground"
            />
            <span>{row.original._count.branches || 0}</span>
          </div>
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
          const tenant = row.original;
          return (
            <Shad.DropdownMenu>
              <Shad.DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground">
                  <Icon name="Ellipsis" size={16} />
                  <span className="sr-only">Actions</span>
                </button>
              </Shad.DropdownMenuTrigger>
              <Shad.DropdownMenuContent align="end">
                <Shad.DropdownMenuLabel>Actions</Shad.DropdownMenuLabel>
                <Shad.DropdownMenuSeparator />
                <Shad.DropdownMenuItem
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setEditTenantOpen(true);
                  }}
                >
                  <Icon name="Pencil" size={14} className="mr-2" />
                  Edit Tenant
                </Shad.DropdownMenuItem>
                <Shad.DropdownMenuItem
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setViewBranchesOpen(true);
                  }}
                >
                  <Icon name="Building2" size={14} className="mr-2" />
                  Manage Branches
                </Shad.DropdownMenuItem>
                <Shad.DropdownMenuSeparator />
                <Shad.DropdownMenuItem
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setViewUsersOpen(true);
                  }}
                >
                  <Icon name="Users" size={14} className="mr-2" />
                  View Users
                </Shad.DropdownMenuItem>
                <Shad.DropdownMenuItem
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setCreateUserOpen(true);
                  }}
                >
                  <Icon name="UserPlus" size={14} className="mr-2" />
                  Add User
                </Shad.DropdownMenuItem>
                <Shad.DropdownMenuSeparator />
                <Shad.DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setDeleteOpen(true);
                  }}
                >
                  <Icon name="Trash2" size={14} className="mr-2" />
                  Delete
                </Shad.DropdownMenuItem>
              </Shad.DropdownMenuContent>
            </Shad.DropdownMenu>
          );
        },
      },
    ],
    []
  );

  return (
    <>
      <Header
        title="Tenants"
        description="Manage all tenant organizations in the system."
      />
      <main className="flex-1 p-6 overflow-auto bg-white">
        <DataTable
          columns={columns}
          data={tenants}
          isLoading={isLoading}
          onRefetch={refetch}
          search={{
            term: searchQuery,
            onTermChange: setSearchQuery,
            keys: ["name"],
          }}
          actions={
            <Button onClick={() => setCreateTenantOpen(true)} iconName="Plus">
              Add Tenant
            </Button>
          }
        />
      </main>

      {/* Create Tenant Dialog */}
      <CreateTenantDialog
        open={createTenantOpen}
        onOpenChange={setCreateTenantOpen}
      />

      {/* Edit Tenant Dialog */}
      <EditTenantDialog
        open={editTenantOpen}
        onOpenChange={(open) => {
          setEditTenantOpen(open);
          if (!open) setSelectedTenant(null);
        }}
        tenant={selectedTenant}
      />

      {/* Manage Branches Dialog */}
      {selectedTenant && (
        <TenantBranchesDialog
          open={viewBranchesOpen}
          onOpenChange={(open) => {
            setViewBranchesOpen(open);
            if (!open) setSelectedTenant(null);
          }}
          tenantId={selectedTenant.id}
          tenantName={selectedTenant.name}
        />
      )}

      {/* View Users Dialog */}
      {selectedTenant && (
        <TenantUsersDialog
          open={viewUsersOpen}
          onOpenChange={(open) => {
            setViewUsersOpen(open);
            if (!open) setSelectedTenant(null);
          }}
          tenantId={selectedTenant.id}
          tenantName={selectedTenant.name}
          businessType={selectedTenant.businessType}
          onCreateUser={() => {
            setViewUsersOpen(false);
            setCreateUserOpen(true);
          }}
        />
      )}

      {/* Create User Dialog */}
      {selectedTenant && (
        <CreateUserDialog
          open={createUserOpen}
          onOpenChange={(open) => {
            setCreateUserOpen(open);
            if (!open) setSelectedTenant(null);
          }}
          tenantId={selectedTenant.id}
          tenantName={selectedTenant.name}
          businessType={selectedTenant.businessType}
        />
      )}

      {/* Delete Tenant Dialog */}
      <DeleteTenantDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelectedTenant(null);
        }}
        tenant={selectedTenant}
      />
    </>
  );
}
