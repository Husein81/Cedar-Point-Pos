import { Header } from "@/components/Header";
import { PageStub } from "@/components/PageStub";

export default function TenantsPage() {
  return (
    <>
      <Header
        title="Tenants"
        description="Manage all tenant organizations in the system."
      />
      <main className="flex-1 p-6 overflow-auto bg-white">
        <PageStub
          title="Tenant Management"
          description="View, create, and manage tenant organizations. Configure tenant settings, subscriptions, and access controls."
          icon="Building2"
        />
      </main>
    </>
  );
}
