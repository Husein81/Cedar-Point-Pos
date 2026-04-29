import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import { useLocale } from "@/components/providers/locale-provider";
import type { BusinessType } from "@repo/types";
import Heading from "@/components/heading";
import { settingsSections, SettingsSectionCard } from "@/components/settings";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  staticData: {
    breadcrumb: "Settings",
  },
});

function SettingsPage() {
  const { user } = useAuthStore();
  const { t } = useLocale();
  const businessType = (user?.tenant?.businessType as BusinessType) ?? "RETAIL";

  const filteredSections = settingsSections.filter((section) =>
    section.showFor.includes(businessType),
  );

  return (
    <div className="space-y-6 pt-4">
      <Heading
        title={t("Settings")}
        subtitle={t("Manage your business configuration and preferences")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSections.map((section) => (
          <SettingsSectionCard key={section.id} section={section} />
        ))}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {t("No settings available for your account.")}
          </p>
        </div>
      )}
    </div>
  );
}
