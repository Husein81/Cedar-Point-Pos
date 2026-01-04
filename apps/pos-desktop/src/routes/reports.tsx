import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reports")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Generate and view business reports and analytics.
      </p>
    </div>
  );
}
