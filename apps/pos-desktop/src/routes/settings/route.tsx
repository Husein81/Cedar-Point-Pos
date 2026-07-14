import TitleBar from "@/components/title-bar";
import { settingsSections } from "@/components/settings";
import { useAuthStore } from "@/store/authStore";
import type { BusinessType } from "@repo/types";
import { cn, Icon, Separator, Shad } from "@repo/ui";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { user } = useAuthStore();
  const pathname = useLocation({ select: (location) => location.pathname });
  const businessType = (user?.tenant?.businessType as BusinessType) ?? "RETAIL";

  const filteredSections = settingsSections.filter((section) =>
    section.showFor.includes(businessType),
  );

  return (
    <div className="flex flex-col gap-6  md:h-[calc(100vh-4rem)] min-h-0 flex-1 gap-6 md:flex-row">
      {/* LEFT: section navigation — fixed, does not scroll */}
      <nav
        aria-label="Settings sections"
        className="flex shrink-0 gap-1 overflow-x-auto md:w-60 md:flex-col md:overflow-x-visible"
      >
        <TitleBar
          title="Settings"
          subtitle="Manage your business configuration and preferences"
        />
        {filteredSections.map((section) => {
          const isActive = pathname === section.href;

          return (
            <Link
              key={section.id}
              to={section.href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:shrink",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon name={section.icon} className="size-4 shrink-0" />
              {section.label}
            </Link>
          );
        })}
      </nav>
      {/* RIGHT: active section content — scrolls independently */}
      <Shad.ScrollArea className="min-w-0 flex-1">
        <Outlet />
      </Shad.ScrollArea>
    </div>
  );
}
