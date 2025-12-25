import { Header } from "@/components/Header";
import { PageStub } from "@/components/PageStub";

export default function UsersPage() {
  return (
    <>
      <Header
        title="Users"
        description="Manage all users across tenant organizations."
      />
      <main className="flex-1 p-6 overflow-auto bg-white">
        <PageStub
          title="User Management"
          description="View and manage users across all tenants. Monitor user activity, roles, and permissions."
          icon="Users"
        />
      </main>
    </>
  );
}
