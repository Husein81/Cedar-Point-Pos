import {
    createFileRoute,
    Outlet,
    Link,
    useLocation,
} from "@tanstack/react-router";
import { useMemo } from "react";
import Heading from "@/components/heading";
import { Button } from "@repo/ui";
import { FileText, CreditCard, Package, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/reports")({
    component: ReportsLayout,
});

// Navigation tabs
const REPORT_TABS = [
    { path: "/reports/sales", label: "Sales", icon: FileText },
    { path: "/reports/payments", label: "Payments", icon: CreditCard },
    { path: "/reports/inventory", label: "Inventory", icon: Package },
    { path: "/reports/products", label: "Products", icon: TrendingUp },
] as const;

/**
 * Reports Layout - provides navigation tabs
 * Each child route manages its own filters and data
 */
function ReportsLayout() {
    const location = useLocation();

    // Current date for subtitle
    const currentDate = useMemo(() => {
        return new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }, []);

    // Check if on a specific report tab
    const isOnTab = (path: string) => location.pathname === path;
    const isOnParentOnly = location.pathname === "/reports";

    return (
        <div className="min-h-screen pt-4">
            <div className="mx-auto space-y-6">
                {/* Header */}
                <Heading
                    title="Reports"
                    subtitle={`Business analytics & performance • ${currentDate}`}
                />

                {/* Report Type Tabs */}
                <div className="flex items-center gap-2 border-b border-border pb-4">
                    {REPORT_TABS.map((tab) => (
                        <Link key={tab.path} to={tab.path}>
                            <Button
                                variant={isOnTab(tab.path) ? "default" : "outline"}
                                size="sm"
                                className="gap-2"
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </Button>
                        </Link>
                    ))}
                </div>

                {/* Child route content or prompt */}
                {isOnParentOnly ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                            <svg
                                className="w-8 h-8 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            Select a Report Type
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Choose a report type from the tabs above to view detailed data.
                        </p>
                    </div>
                ) : (
                    <Outlet />
                )}
            </div>
        </div>
    );
}
