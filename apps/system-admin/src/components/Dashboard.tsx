"use client";

import { useEffect, useState } from "react";
import { MetricCard, MetricCardSkeleton } from "@/components/MetricCard";
import { StatusCard, StatusCardSkeleton } from "@/components/StatusCard";
import { AlertCard, AlertCardSkeleton } from "@/components/AlertCard";
import { SectionHeader } from "@/components/SectionHeader";
import { dashboardApi } from "@/apis/dashboardApi";
import type {
  DashboardOverview,
  DashboardFinance,
  DashboardOperations,
  DashboardAlerts,
} from "@/types/dashboard";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/ui/components/alert";
import { Icon } from "@repo/ui";

interface DashboardState {
  overview: DashboardOverview | null;
  finance: DashboardFinance | null;
  operations: DashboardOperations | null;
  alerts: DashboardAlerts | null;
  isLoading: boolean;
  error: string | null;
}

export function Dashboard() {
  const [state, setState] = useState<DashboardState>({
    overview: null,
    finance: null,
    operations: null,
    alerts: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Fetch all data in parallel
        const [overview, finance, operations, alerts] = await Promise.all([
          dashboardApi.getOverview(),
          dashboardApi.getFinance(),
          dashboardApi.getOperations(),
          dashboardApi.getAlerts(),
        ]);

        setState({
          overview,
          finance,
          operations,
          alerts,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error ? err.message : "Failed to load dashboard data",
        }));
      }
    };

    fetchDashboardData();
  }, []);

  // Format currency helper
  const formatCurrency = (value: string | number | null): string => {
    if (value === null) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const { overview, finance, operations, alerts, isLoading, error } = state;

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <Icon name="CircleAlert" size={16} />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Section 1: System Overview KPIs */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                title="Total Tenants"
                value={overview?.tenants ?? 0}
                icon="Building2"
              />
              <MetricCard
                title="Total Users"
                value={overview?.users ?? 0}
                icon="Users"
              />
              <MetricCard
                title="Total Branches"
                value={overview?.branches ?? 0}
                icon="MapPin"
              />
              <MetricCard
                title="Orders Today"
                value={overview?.ordersToday ?? 0}
                icon="ShoppingCart"
              />
            </>
          )}
        </div>
      </section>

      {/* Section 2: Operational & Financial Health */}
      <section>
        <SectionHeader title="Operational & Financial Health" icon="SquarePlus" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <StatusCardSkeleton />
              <StatusCardSkeleton />
              <StatusCardSkeleton />
              <StatusCardSkeleton />
            </>
          ) : (
            <>
              <StatusCard
                title="Total Revenue (Today)"
                value={formatCurrency(
                  finance?.totalRevenueToday?._sum?.total ?? null
                )}
                icon="DollarSign"
                variant="success"
              />
              <StatusCard
                title="Open Shifts"
                value={operations?.openShifts ?? 0}
                icon="Clock"
                variant="warning"
              />
              <StatusCard
                title="Inactive Devices"
                value={operations?.inactiveDevices ?? 0}
                icon="LayoutGrid"
                variant="default"
              />
              <StatusCard
                title="Pending Transfers"
                value={operations?.pendingTransfers ?? 0}
                icon="ArrowLeftRight"
                variant="default"
              />
            </>
          )}
        </div>
      </section>

      {/* Section 3: System Alerts */}
      <section>
        <SectionHeader title="System Alerts" icon="TriangleAlert" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isLoading ? (
            <>
              <AlertCardSkeleton />
              <AlertCardSkeleton />
            </>
          ) : (
            <>
              <AlertCard
                title="Low Stock Items Detected"
                description={`${alerts?.lowStockItems ?? 0} SKUs are below safety stock levels across all tenants.`}
                icon="LayoutGrid"
                variant="error"
              />
              <AlertCard
                title="Stale Devices (6+ Hours)"
                description={`${alerts?.staleDevices ?? 0} POS terminals have not synced since last check.`}
                icon="WifiOff"
                variant="warning"
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
