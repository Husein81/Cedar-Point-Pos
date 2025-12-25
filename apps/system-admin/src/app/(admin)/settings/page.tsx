import { Header } from "@/components/Header";
import { PageStub } from "@/components/PageStub";

export default function SettingsPage() {
  return (
    <>
      <Header
        title="Settings"
        description="Configure system-wide settings and preferences."
      />
      <main className="flex-1 p-6 overflow-auto bg-white">
        <PageStub
          title="System Settings"
          description="Configure global system settings, security policies, integrations, and administrative preferences."
          icon="Settings"
        />
      </main>
    </>
  );
}
