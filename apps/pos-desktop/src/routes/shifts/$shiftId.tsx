import { createFileRoute } from "@tanstack/react-router";
import { ShiftDetailPanel } from "@/components/shifts/ShiftDetailPanel";
import Heading from "@/components/heading";

export const Route = createFileRoute("/shifts/$shiftId")({
  component: ShiftDetailPage,
});

function ShiftDetailPage() {
  const { shiftId } = Route.useParams();

  return (
    <div className="pt-4">
      <div className="mx-auto space-y-6">
        <Heading
          title="Shift Detail"
          subtitle="View shift information, cash movements, and X report"
          href="/shifts"
        />
        <ShiftDetailPanel shiftId={shiftId} />
      </div>
    </div>
  );
}
