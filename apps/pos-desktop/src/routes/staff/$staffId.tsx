import { ResetPasswordForm } from "@/components/staff/ResetPasswordForm";
import { SetPinForm } from "@/components/staff/SetPinForm";
import { StaffActivityLog } from "@/components/staff/StaffActivityLog";
import { StaffForm } from "@/components/staff/StaffForm";
import { ROLE_LABELS } from "@/constants/staff";
import { DEFAULT_LOCALE } from "@/constants/locale";
import {
  useEndStaffSession,
  useStaffMember,
  useToggleStaffActive,
  useToggleStaffPos,
} from "@/hooks/useStaff";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import { getInitials } from "@/utils/getInitials";
import { UserRole, canManageRole } from "@repo/types";
import { Avatar, Badge, Button, Icon, Shad, Skeleton } from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/$staffId")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Staff Details",
  },
});

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(DEFAULT_LOCALE, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(DEFAULT_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function RouteComponent() {
  const { staffId } = Route.useParams();
  const { data: staff, isLoading } = useStaffMember(staffId);
  const actorRole = useAuthStore((state) => state.user?.role);
  const openModal = useModalStore((state) => state.openModal);

  const toggleActive = useToggleStaffActive();
  const togglePos = useToggleStaffPos();
  const endSession = useEndStaffSession();

  if (isLoading) {
    return <StaffDetailSkeleton />;
  }

  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">Staff member not found</p>
        <Link to="/staff">
          <Button variant="outline" iconName="ArrowLeft">
            Back to Staff
          </Button>
        </Link>
      </div>
    );
  }

  const canManage = !!actorRole && canManageRole(actorRole, staff.role);
  // Deactivating is an ADMIN-only endpoint on the server.
  const isAdmin = actorRole === UserRole.ADMIN;
  const { activeSession } = staff;

  const handleEdit = () => openModal("Edit Staff", <StaffForm staff={staff} />);
  const handleSetPin = () =>
    openModal("Set POS PIN", <SetPinForm staffId={staff.id} />);
  const handleResetPassword = () =>
    openModal("Reset Password", <ResetPasswordForm staffId={staff.id} />);

  const handleToggleActive = () => {
    if (
      staff.isActive &&
      !window.confirm(
        `Deactivate "${staff.name}"? They will also lose POS access.`
      )
    ) {
      return;
    }
    toggleActive.mutate(staff.id);
  };

  const handleEndSession = () => {
    if (!activeSession) return;
    if (!window.confirm(`End the active POS session for "${staff.name}"?`)) {
      return;
    }
    endSession.mutate(activeSession.id);
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/staff">
          <Button variant="ghost" size="icon" iconName="ArrowLeft" />
        </Link>

        <div className="flex items-center gap-4 flex-1">
          <Avatar
            fallback={getInitials(staff.name)}
            className="h-16 w-16 text-xl bg-primary/10 text-primary border-2 border-background shadow-sm"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {staff.name}
              </h1>
              <Badge variant="secondary">{ROLE_LABELS[staff.role]}</Badge>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground mt-1 text-sm">
              <span>@{staff.username}</span>
              {staff.branch?.name && <span>· {staff.branch.name}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {staff.isActive ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
              <Badge variant={staff.hasPosAccess ? "default" : "outline"}>
                {staff.hasPosAccess ? "POS access" : "No POS access"}
              </Badge>
              <Badge variant={staff.isPinSet ? "default" : "outline"}>
                {staff.isPinSet ? "PIN set" : "No PIN"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" iconName="SquarePen" onClick={handleEdit}>
            Edit
          </Button>
          <Button variant="outline" iconName="KeyRound" onClick={handleSetPin}>
            Set PIN
          </Button>
          <Button
            variant="outline"
            iconName="LockKeyhole"
            onClick={handleResetPassword}
          >
            Reset Password
          </Button>
          <Button
            variant="outline"
            iconName={staff.hasPosAccess ? "MonitorOff" : "Monitor"}
            onClick={() => togglePos.mutate(staff.id)}
            disabled={togglePos.isPending}
          >
            {staff.hasPosAccess ? "Revoke POS Access" : "Grant POS Access"}
          </Button>
          {activeSession && (
            <Button
              variant="outline"
              iconName="LogOut"
              onClick={handleEndSession}
              disabled={endSession.isPending}
            >
              End Session
            </Button>
          )}
          {isAdmin && (
            <Button
              variant={staff.isActive ? "destructive" : "outline"}
              iconName={staff.isActive ? "UserX" : "UserCheck"}
              onClick={handleToggleActive}
              disabled={toggleActive.isPending}
            >
              {staff.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Last Login"
          value={formatDate(staff.lastLoginAt) ?? "Never"}
          icon="Clock"
        />
        <StatCard
          title="Member Since"
          value={formatDate(staff.createdAt) ?? "—"}
          icon="Calendar"
        />
        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Active Session
            </Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent>
            {activeSession ? (
              <div className="text-sm">
                <div className="font-medium">
                  Started {formatDateTime(activeSession.startedAt)}
                </div>
                {activeSession.deviceId && (
                  <div className="text-muted-foreground">
                    Device {activeSession.deviceId}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                No active session
              </div>
            )}
          </Shad.CardContent>
        </Shad.Card>
      </div>

      {/* Contact card */}
      <Shad.Card>
        <Shad.CardHeader>
          <Shad.CardTitle>Contact</Shad.CardTitle>
        </Shad.CardHeader>
        <Shad.CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-base">{staff.email || "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <p className="text-base">{staff.phone || "—"}</p>
          </div>
        </Shad.CardContent>
      </Shad.Card>

      {/* Activity log */}
      <div className="border-t pt-6">
        <StaffActivityLog staffId={staff.id} />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <Shad.Card>
      <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Shad.CardTitle className="text-sm font-medium">{title}</Shad.CardTitle>
        <Icon name={icon} className="h-4 w-4 text-muted-foreground" />
      </Shad.CardHeader>
      <Shad.CardContent>
        <div className="text-lg font-semibold">{value}</div>
      </Shad.CardContent>
    </Shad.Card>
  );
}

function StaffDetailSkeleton() {
  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex items-center gap-4 flex-1">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Shad.Card key={i}>
            <Shad.CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </Shad.CardHeader>
            <Shad.CardContent>
              <Skeleton className="h-6 w-32" />
            </Shad.CardContent>
          </Shad.Card>
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
