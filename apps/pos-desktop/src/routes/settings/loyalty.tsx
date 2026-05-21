import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import TitleBar from "@/components/title-bar";
import { LoyaltyProgramForm } from "@/components/loyalty/LoyaltyProgramForm";
import { Icon, Badge, Shad } from "@repo/ui";
import { useLoyaltyProgram } from "@/hooks/useLoyalty";

export const Route = createFileRoute("/settings/loyalty")({
  component: LoyaltySettingsPage,
  staticData: {
    breadcrumb: "Loyalty",
  },
});

function LoyaltySettingsPage() {
  const { isHighLevelUser } = useAuthStore();
  const { data: program } = useLoyaltyProgram();

  return (
    <div className="space-y-4">
      <TitleBar
        title="Loyalty Program"
        subtitle="Configure how customers earn and redeem loyalty points"
        href="/settings"
      />

      {/* Status banner */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Icon name="Award" className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={program?.isEnabled ? "default" : "outline"}>
            {program?.isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        {program?.enrollmentMode && (
          <>
            <div className="border-l border-border h-6" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Enrollment:</span>
              <span className="text-sm font-medium">
                {program.enrollmentMode}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Icon
          name="Info"
          className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Loyalty Program
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            When enabled, customers earn points on completed orders and can
            redeem them for discounts at checkout. Points are earned based on
            the order total and redeemed in configurable steps.
          </p>
        </div>
      </div>

      {/* Form card */}
      <Shad.Card>
        <Shad.CardContent className="pt-6">
          <LoyaltyProgramForm canEdit={!!isHighLevelUser} />
        </Shad.CardContent>
      </Shad.Card>
    </div>
  );
}
