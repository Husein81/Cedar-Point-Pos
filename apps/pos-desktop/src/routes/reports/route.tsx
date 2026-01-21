import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import Heading from "@/components/heading";
import { useMemo } from "react";
import { ReportCard, REPORT_CARDS } from "@/components/reports";

export const Route = createFileRoute("/reports")({
  component: ReportsLayout,
});

function ReportsLayout() {
  const location = useLocation();

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const isRoot = location.pathname === "/reports";
  const title = location.pathname
    .replace("/reports/", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="pt-4">
      <div className="mx-auto space-y-6">
        <Heading
          title={isRoot ? "Reports" : title}
          subtitle={`Business analytics & performance • ${currentDate}`}
          href={isRoot ? "" : "/reports"}
        />

        {isRoot ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_CARDS.map((card) => (
              <ReportCard
                key={card.path}
                to={card.path}
                title={card.title}
                description={card.description}
                icon={card.icon}
              />
            ))}
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
