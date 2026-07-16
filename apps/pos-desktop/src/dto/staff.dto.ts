import type { StaffActivityLog, StaffSession, UserRole } from "@repo/types";

export type StaffActivity = Omit<StaffActivityLog, "createdAt"> & {
  createdAt: string;
};

export type StaffSessionView = Omit<StaffSession, "startedAt" | "endedAt"> & {
  startedAt: string;
  endedAt: string | null;
};

export type StaffView = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  isActive: boolean;
  hasPosAccess: boolean;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  lastLoginAt: string | null;
  isPinSet: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffDetail = StaffView & {
  recentActivity: StaffActivity[];
  activeSession: StaffSessionView | null;
};
