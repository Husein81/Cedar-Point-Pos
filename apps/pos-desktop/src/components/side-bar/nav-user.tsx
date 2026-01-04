// import { Shad } from "@repo/ui";
import { useLogout } from "@/hooks/auth";
import { useAuthStore } from "@/store/authStore";
import { Avatar, Icon, Shad } from "@repo/ui";
import Appearance from "./appearance";

const NavUser = () => {
  const { user } = useAuthStore();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <Avatar fallback={user?.name?.charAt(0).toUpperCase()} />
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
          }}
        >
          <Appearance />
        </Shad.DropdownMenuItem>
        <Shad.DropdownMenuSeparator />

        <Shad.DropdownMenuItem
          className="hover:bg-destructive hover:text-gray-200"
          onSelect={() => handleLogout()}
        >
          <Icon name="LogOut" className="mr-2 hover:text-gray-200" />
          <span>Logout</span>
        </Shad.DropdownMenuItem>
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
export default NavUser;
