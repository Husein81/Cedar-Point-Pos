import { useLogout } from "@/hooks/auth";
import { useAuthStore } from "@/store/authStore";
import { useLocale } from "@/components/providers/locale-provider";
import { Avatar, Icon, SButton, Shad } from "@repo/ui";
import Appearance from "./appearance";
import { useNavigate } from "@tanstack/react-router";

const NavUser = () => {
  const { user } = useAuthStore();
  const { t } = useLocale();
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    navigate({ to: "/auth" });
    await logoutMutation.mutateAsync();
  };

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <SButton
          variant={"ghost"}
          className="flex w-full  items-center justify-between text-muted-foreground gap-2 cursor-pointer "
        >
          <div className="flex items-center gap-2">
            <Avatar fallback={user?.name?.charAt(0).toUpperCase()} />
            <div className="flex flex-col leading-tight items-start">
              <span className="text-sm font-medium ">
                {user?.name || "User menu"}
              </span>
              <span className="text-xs ">{user?.role || "No email"}</span>
            </div>
          </div>
          <Icon name="ChevronsUpDown" className="w-4 h-4 " />
        </SButton>
      </Shad.DropdownMenuTrigger>

      <Shad.DropdownMenuContent align="start" className="sm:max-w-lg">
        <Shad.DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <Avatar fallback={user?.name[0]?.charAt(0).toUpperCase()} />
            <span className="">{user?.name || "Unknown User"}</span>
          </div>
        </Shad.DropdownMenuLabel>

        <Shad.DropdownMenuSeparator />

        <Shad.DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            navigate({ to: "/settings" });
          }}
        >
          <Icon name="User" className="me-2" />
          <span>{t("Profile")}</span>
        </Shad.DropdownMenuItem>
        <Shad.DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          <Appearance />
        </Shad.DropdownMenuItem>
        <Shad.DropdownMenuSeparator />
        <Shad.DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            navigate({ to: "/settings" });
          }}
        >
          <Icon name="Settings" className="me-2" />
          <span>{t("Settings")}</span>
        </Shad.DropdownMenuItem>
        <Shad.DropdownMenuSeparator />

        <Shad.DropdownMenuItem
          className="hover:bg-destructive hover:text-gray-200"
          onSelect={() => handleLogout()}
        >
          <Icon name="LogOut" className="me-2 hover:text-gray-200" />
          <span>{t("Logout")}</span>
        </Shad.DropdownMenuItem>
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
export default NavUser;
