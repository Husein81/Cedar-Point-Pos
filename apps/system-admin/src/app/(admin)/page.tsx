"use client";
import { Dashboard } from "@/components/Dashboard";

import { Header } from "@/components/Header";
import { Pagination } from "@repo/ui";

export default function DashboardPage() {
  return (
    <>
      <Header
        title="System Overview"
        description="Real-time monitoring across all tenant environments."
      />
      <main className="flex-1 p-6 overflow-auto bg-white">
        <Dashboard />
      </main>
      <Pagination
        page={1}
        pageSize={10}
        totalPages={5}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />
    </>
  );
}
