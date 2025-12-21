import { useAuthStore } from "@/store/authStore";
import { Icon, Shad } from "@repo/ui";
import { useTheme } from "next-themes";

const Settings = () => {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger asChild>
        <Shad.SidebarMenuButton className="hover:text-gray-200">
          <Icon name="Settings" />
          <span>Settings</span>
        </Shad.SidebarMenuButton>
      </Shad.DropdownMenuTrigger>

      <Shad.DropdownMenuContent align="start" className="w-44">
        <Shad.DropdownMenuItem className="hover:text-text">
          <div className="flex items-center gap-2">
            <Shad.Avatar>
              <Shad.AvatarFallback>
                {user?.name.charAt(0).toUpperCase()}
              </Shad.AvatarFallback>
            </Shad.Avatar>
            <span>{user?.name}</span>
          </div>
        </Shad.DropdownMenuItem>

        <Shad.DropdownMenuSeparator />
        {/* Theme Toggle */}
        <Shad.DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setTheme(isDark ? "light" : "dark");
          }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>Preference</span>
          </div>
        </Shad.DropdownMenuItem>
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};

export default Settings;
