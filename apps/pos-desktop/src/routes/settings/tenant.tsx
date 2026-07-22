import { TenantForm } from "@/components/settings/tenant/TenantForm";
import TitleBar from "@/components/title-bar";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/tenant")({
  component: TenantSettingsPage,
  staticData: {
    breadcrumb: "Tenant Details",
  },
});

function TenantSettingsPage() {
  return (
    <div className="space-y-6">
      <TitleBar
        title="Tenant"
        subtitle="Manage your tenant details and information"
      />
      <TenantForm />
    </div>
  );
}
