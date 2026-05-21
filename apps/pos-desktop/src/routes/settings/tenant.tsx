import { createFileRoute } from "@tanstack/react-router";
import { TenantForm } from "@/components/settings/tenant/TenantForm";
import { BranchManagement } from "@/components/settings/tenant/BranchManagement";
import TitleBar from "@/components/title-bar";

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
        href="/settings"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TenantForm />
        <BranchManagement />
      </div>
    </div>
  );
}
