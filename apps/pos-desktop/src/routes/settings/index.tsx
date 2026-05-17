import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import type { BusinessType } from "@repo/types";
import TitleBar from "@/components/title-bar";
import { settingsSections, SettingsSectionCard } from "@/components/settings";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  staticData: {
    breadcrumb: "Settings",
  },
});

function SettingsPage() {
  const { user } = useAuthStore();
  const businessType = (user?.tenant?.businessType as BusinessType) ?? "RETAIL";

  // Filter sections based on business type
  const filteredSections = settingsSections.filter((section) =>
    section.showFor.includes(businessType),
  );

  return (
    <div className="space-y-6 pt-4">
      <TitleBar
        title="Settings"
        subtitle="Manage your business configuration and preferences"
      />

      {/* Settings Section Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSections.map((section) => (
          <SettingsSectionCard key={section.id} section={section} />
        ))}
      </div>

      {/* Empty State */}
      {filteredSections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No settings available for your account.
          </p>
        </div>
      )}
    </div>
  );
}
