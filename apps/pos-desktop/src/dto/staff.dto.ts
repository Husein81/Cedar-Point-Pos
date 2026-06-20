import type { StaffActivityLog, StaffSession, UserRole } from "@repo/types";

// The API serializes timestamps to ISO strings over the wire. Reuse the
// canonical @repo/types shapes (so enums/fields stay single-sourced) but
// represent date fields as strings — matching how every POS dto consumes
// them via `new Date(...)`.
export type StaffActivity = Omit<StaffActivityLog, "createdAt"> & {
  createdAt: string;
};

export type StaffSessionView = Omit<
  StaffSession,
  "startedAt" | "endedAt"
> & {
  startedAt: string;
  endedAt: string | null;
};

// The StaffService `STAFF_SELECT` projection, minus `pinHash`, plus the derived
// `isPinSet`. Never expect `password`, `pinHash`, or `refreshToken` here.
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

// GET /staff/:id payload: profile + recent activity + the active POS session.
export type StaffDetail = StaffView & {
  recentActivity: StaffActivity[];
  activeSession: StaffSessionView | null;
};
