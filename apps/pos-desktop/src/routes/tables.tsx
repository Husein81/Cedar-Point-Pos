import { TablesPage } from "@/components/tables";
import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/tables")({
  beforeLoad: async () => {
    const { user } = useAuthStore.getState();
    
    // Prevent access to tables page if tenant is RETAIL business type
    if (user?.tenant?.businessType === "RETAIL") {
      throw new Error("Tables page is not available for retail tenants");
    }
  },
  component: TablesPage,
});
