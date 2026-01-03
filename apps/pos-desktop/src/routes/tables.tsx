import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tables")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tables</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Manage your restaurant tables and reservations.
      </p>
    </div>
  );
}
