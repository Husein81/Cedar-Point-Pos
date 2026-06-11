import { StaffForm } from "@/components/staff/StaffForm";
import TitleBar from "@/components/title-bar";
import { getStaffColumns } from "@/constants/columns/staffColumn";
import { ROLE_LABELS } from "@/constants/staff";
import { useBranches } from "@/hooks/useBranch";
import { useStaffList } from "@/hooks/useStaff";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import { ASSIGNABLE_ROLES, UserRole } from "@repo/types";
import type { StaffQuery } from "@repo/types";
import { Button, DataTable, Select } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/staff/")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Staff",
  },
});

const ALL = "ALL";
const PAGE_SIZE = 20;

function RouteComponent() {
  const actorRole = useAuthStore((state) => state.user?.role);
  const openModal = useModalStore((state) => state.openModal);
  const { data: branches } = useBranches();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(ALL);
  const [branchId, setBranchId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [posAccess, setPosAccess] = useState(ALL);
  const [page, setPage] = useState(1);

  const query: StaffQuery = {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    role: role === ALL ? undefined : (role as UserRole),
    branchId: branchId === ALL ? undefined : branchId,
    isActive: status === ALL ? undefined : status === "active",
    hasPosAccess: posAccess === ALL ? undefined : posAccess === "yes",
  };

  const { data, isLoading, refetch } = useStaffList(query);

  const isAdmin = actorRole === UserRole.ADMIN;

  const roleOptions = [
    { value: ALL, label: "All roles" },
    ...ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
  ];
  const branchOptions = [
    { value: ALL, label: "All branches" },
    ...(branches ?? []).map((b) => ({ value: b.id, label: b.name })),
  ];
  const statusOptions = [
    { value: ALL, label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];
  const posOptions = [
    { value: ALL, label: "All POS access" },
    { value: "yes", label: "Has POS access" },
    { value: "no", label: "No POS access" },
  ];

  const resetPage = () => setPage(1);

  const handleCreate = () => openModal("Create Staff", <StaffForm />);

  return (
    <div className="space-y-4 pt-4">
      <TitleBar
        title="Staff"
        subtitle="Manage staff accounts, roles, and POS access"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={roleOptions}
          value={role}
          onChange={(opt) => {
            setRole(opt.value);
            resetPage();
          }}
          placeholder="All roles"
          className="w-44"
        />
        <Select
          options={branchOptions}
          value={branchId}
          onChange={(opt) => {
            setBranchId(opt.value);
            resetPage();
          }}
          placeholder="All branches"
          className="w-44"
        />
        <Select
          options={statusOptions}
          value={status}
          onChange={(opt) => {
            setStatus(opt.value);
            resetPage();
          }}
          placeholder="All statuses"
          className="w-40"
        />
        <Select
          options={posOptions}
          value={posAccess}
          onChange={(opt) => {
            setPosAccess(opt.value);
            resetPage();
          }}
          placeholder="All POS access"
          className="w-44"
        />
      </div>

      <DataTable
        isLoading={isLoading}
        columns={getStaffColumns()}
        data={data?.data ?? []}
        onRefetch={refetch}
        actions={
          isAdmin ? (
            <Button onClick={handleCreate} iconName="Plus">
              Add Staff
            </Button>
          ) : undefined
        }
        search={{
          term: search,
          onTermChange: (term) => {
            setSearch(term);
            resetPage();
          },
          keys: ["name", "username", "email"],
        }}
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
    </div>
  );
}
