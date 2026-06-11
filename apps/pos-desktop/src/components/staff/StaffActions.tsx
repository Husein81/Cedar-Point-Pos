import { useToggleStaffActive, useToggleStaffPos } from "@/hooks/useStaff";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import type { StaffView } from "@/dto/staff.dto";
import { UserRole, canManageRole } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { StaffForm } from "./StaffForm";

export const StaffActions = ({ staff }: { staff: StaffView }) => {
  const openModal = useModalStore((state) => state.openModal);
  const actorRole = useAuthStore((state) => state.user?.role);
  const navigate = useNavigate();
  const toggleActive = useToggleStaffActive();
  const togglePos = useToggleStaffPos();

  const canManage = !!actorRole && canManageRole(actorRole, staff.role);
  // Toggling `isActive` is an ADMIN-only endpoint on the server.
  const isAdmin = actorRole === UserRole.ADMIN;

  const handleEdit = () =>
    openModal("Edit Staff", <StaffForm staff={staff} />);

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

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <Icon name="Ellipsis" className="size-4" />
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent align="end">
        <Shad.DropdownMenuItem
          onClick={() => navigate({ to: `/staff/${staff.id}` })}
        >
          <Icon name="Eye" className="h-4 w-4" />
          View Details
        </Shad.DropdownMenuItem>

        {canManage && (
          <>
            <Shad.DropdownMenuItem onClick={handleEdit}>
              <Icon name="SquarePen" className="h-4 w-4" />
              Edit
            </Shad.DropdownMenuItem>

            <Shad.DropdownMenuItem
              onClick={() => togglePos.mutate(staff.id)}
              disabled={togglePos.isPending}
            >
              <Icon
                name={staff.hasPosAccess ? "MonitorOff" : "Monitor"}
                className="h-4 w-4"
              />
              {staff.hasPosAccess ? "Revoke POS Access" : "Grant POS Access"}
            </Shad.DropdownMenuItem>

            {isAdmin && (
              <Shad.DropdownMenuItem
                onClick={handleToggleActive}
                disabled={toggleActive.isPending}
                variant={staff.isActive ? "destructive" : undefined}
              >
                <Icon
                  name={staff.isActive ? "UserX" : "UserCheck"}
                  className="h-4 w-4"
                />
                {staff.isActive ? "Deactivate" : "Activate"}
              </Shad.DropdownMenuItem>
            )}
          </>
        )}
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
