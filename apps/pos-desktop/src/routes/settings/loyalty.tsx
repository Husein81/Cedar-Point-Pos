import Heading from "@/components/heading";
import { LoyaltyProgramForm } from "@/components/loyalty/LoyaltyProgramForm";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/loyalty")({
  component: LoyaltySettingsPage,
  staticData: {
    breadcrumb: "Loyalty",
  },
});

function LoyaltySettingsPage() {
  const { isHighLevelUser } = useAuthStore();

  return (
    <div className="space-y-4 pt-4">
      <Heading
        title="Loyalty Program"
        subtitle="Configure customer points earning and redemption rules"
        href="/settings"
      />

      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Icon
          name="Info"
          className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Loyalty Program Scope
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Loyalty is configured per tenant and applies to all customers.
            Customers participate when attached to orders.
          </p>
        </div>
      </div>

      <LoyaltyProgramForm canEdit={!!isHighLevelUser} />
    </div>
  );
}
