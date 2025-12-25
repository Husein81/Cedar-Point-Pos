import { Header } from "@/components/Header";
import { PageStub } from "@/components/PageStub";

export default function SystemHealthPage() {
  return (
    <>
      <Header
        title="System Health"
        description="Monitor system performance and infrastructure status."
      />
      <main className="flex-1 p-6 overflow-auto bg-white">
        <PageStub
          title="System Health Monitoring"
          description="View real-time system metrics, server status, API performance, and infrastructure health indicators."
          icon="Activity"
        />
      </main>
    </>
  );
}
