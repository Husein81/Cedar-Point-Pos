import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/stock")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Stock Management</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Monitor and manage your inventory stock levels.
      </p>
    </div>
  );
}
