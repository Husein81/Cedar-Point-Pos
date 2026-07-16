import { StaffForm } from "@/components/staff/StaffForm";
import TitleBar from "@/components/title-bar";
import { getStaffColumns } from "@/constants/columns/staffColumn";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import { ROLE_LABELS } from "@/constants/staff";
import { useBranches } from "@/hooks/useBranch";
import { usePaginationState } from "@/hooks/usePaginationState";
import { useStaffList } from "@/hooks/useStaff";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import { ASSIGNABLE_ROLES, UserRole } from "@repo/types";
import type { StaffQuery } from "@repo/types";
import { Button, DataTable, Select } from "@repo/ui";
import { useState } from "react";
import { posOptions, statusOptions } from "./config";

const ALL = "ALL";

export function StaffPage() {
  const actorRole = useAuthStore((state) => state.user?.role);
  const openModal = useModalStore((state) => state.openModal);
  const { data: branches } = useBranches();
  const { page, setPage, searchQuery, setSearchQuery, resetPage } =
    usePaginationState({
      initialPage: 1,
      initialPageSize: DEFAULT_PAGE_SIZE,
    });

  const [role, setRole] = useState(ALL);
  const [branchId, setBranchId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [posAccess, setPosAccess] = useState(ALL);

  const query: StaffQuery = {
    page,
    limit: DEFAULT_PAGE_SIZE,
    search: searchQuery || undefined,
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
          term: searchQuery,
          onTermChange: (term) => {
            setSearchQuery(term);
            resetPage();
          },
          keys: ["name", "username", "email"],
        }}
        pagination={
          data?.pagination
            ? {
                rows: data.pagination.totalCount,
                page,
                pageSize: DEFAULT_PAGE_SIZE,
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
