import { TenantForm } from "@/components/settings/tenant/TenantForm";
import TitleBar from "@/components/title-bar";
import { useAuthStore } from "@/store/authStore";
import { Empty } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/tenant")({
  component: TenantSettingsPage,
  staticData: {
    breadcrumb: "Tenant Details",
  },
});

function TenantSettingsPage() {
  // Tenant identity + branch management are admin-only (backend enforces the
  // same on PATCH /tenants/my-tenant). Guard direct navigation here.
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  return (
    <div className="space-y-6">
      <TitleBar
        title="Tenant"
        subtitle="Manage your tenant details and information"
      />
      {isAdmin ? (
        <TenantForm />
      ) : (
        <Empty
          icon="Lock"
          title="Admin access required"
          description="Only an administrator can manage tenant details and branches."
        />
      )}
    </div>
  );
}
