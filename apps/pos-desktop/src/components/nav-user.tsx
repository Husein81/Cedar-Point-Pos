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
      <Shad.DropdownMenuContent align="center" className="w-48">
        <Shad.DropdownMenuLabel>
          {user?.name || "Unknown User"}
        </Shad.DropdownMenuLabel>
        <Shad.DropdownMenuSeparator />
        {isAuthenticated && (
          <Shad.DropdownMenuItem onSelect={() => handleLogout()}>
            <Icon name="LogOut" className="mr-2" />
          </Shad.DropdownMenuItem>
        )}
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
export default NavUser;
