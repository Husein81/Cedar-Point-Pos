// import { Shad } from "@repo/ui";
import { useLogout } from "@/hooks/auth";
import { useAuthStore } from "@/store/authStore";
import { Icon, Shad } from "@repo/ui";

const NavUser = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    logout();
    await logoutMutation.mutateAsync();
  };
  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <Shad.Avatar>
          <Shad.AvatarFallback>
            {user?.name ? user.name.charAt(0).toUpperCase() : "UN"}
          </Shad.AvatarFallback>
        </Shad.Avatar>
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent align="start" className="w-48">
        <Shad.DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <Shad.Avatar>
              <Shad.AvatarFallback>
                {user?.name ? user.name.charAt(0).toUpperCase() : "UN"}
              </Shad.AvatarFallback>
            </Shad.Avatar>
            <span className="">{user?.name || "Unknown User"}</span>
          </div>
        </Shad.DropdownMenuLabel>
        <Shad.DropdownMenuSeparator />
        {isAuthenticated && (
          <Shad.DropdownMenuItem
            className="hover:bg-destructive hover:text-gray-200"
            onSelect={() => handleLogout()}
          >
            <Icon name="LogOut" className="mr-2 hover:text-gray-200" />
            <span>Logout</span>
          </Shad.DropdownMenuItem>
        )}
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
export default NavUser;
