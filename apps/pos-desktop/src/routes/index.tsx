import { useLogout } from "@/hooks/auth";
import { useAuthStore } from "@/store/authStore";
import { Badge, Button, Separator, Shad } from "@repo/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  ShoppingCart,
  CreditCard,
  FileBarChart,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const logout = useLogout();

  // TODO:mock state (replace later)
  const shift = {
    status: "OPEN",
    openedAt: "09:12 AM",
  };

  const today = {
    orders: 42,
    revenue: "1,245,000 LBP",
    cash: "820,000 LBP",
  };

  const currentTime = new Date().toLocaleDateString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleLogout = async () => {
    await logout.mutateAsync();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* =====================
          HEADER
      ===================== */}
      <div className="flex items-center justify-between rounded-lg border bg-card shadow-sm  px-4 py-3">
        {/* LEFT — USER */}
        <div className="flex items-center gap-3">
          <Shad.Avatar className="size-9">
            <Shad.AvatarFallback className="font-semibold">
              {user?.name?.[0].toUpperCase() ?? "UN"}
            </Shad.AvatarFallback>
          </Shad.Avatar>

          <div className="leading-tight">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role?.toLowerCase()}
            </p>
          </div>
        </div>

        {/* CENTER — SHIFT + TIME */}
        <div className="flex items-center gap-4">
          <Badge
            variant={shift.status === "OPEN" ? "default" : "destructive"}
            className="px-3 py-1 text-xs"
          >
            {shift.status === "OPEN" ? "Shift Open" : "Shift Closed"}
          </Badge>

          <div className="text-sm text-muted-foreground">{currentTime}</div>
        </div>

        {/* RIGHT — ACTIONS */}
        <Shad.DropdownMenu>
          <Shad.DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronDown className="h-5 w-5" />
            </Button>
          </Shad.DropdownMenuTrigger>

          <Shad.DropdownMenuContent align="end" className="w-44">
            <Shad.DropdownMenuItem>Close Shift</Shad.DropdownMenuItem>

            <Shad.DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive"
            >
              Logout
            </Shad.DropdownMenuItem>
          </Shad.DropdownMenuContent>
        </Shad.DropdownMenu>
      </div>

      <Separator />

      {/* =====================
          PRIMARY ACTIONS
      ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Shad.Card>
          <Shad.CardContent className="flex flex-col gap-4 pt-6">
            <Shad.CardTitle>New Sale</Shad.CardTitle>
            <p className="text-sm text-muted-foreground">
              Start a new order immediately
            </p>
            <Button size="lg" className="w-full">
              <Plus className="mr-2 h-5 w-5" />
              New Sale
            </Button>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardContent className="flex flex-col gap-4 pt-6">
            <Shad.CardTitle>Resume Order</Shad.CardTitle>
            <p className="text-sm text-muted-foreground">
              Continue an open order
            </p>
            <Button size="lg" variant="secondary" className="w-full">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Open Orders
            </Button>
          </Shad.CardContent>
        </Shad.Card>
      </div>

      {/* =====================
          TODAY STATS
      ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Shad.Card>
          <Shad.CardHeader>
            <Shad.CardTitle className="text-sm">Orders Today</Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent className="text-2xl font-semibold">
            {today.orders}
          </Shad.CardContent>
        </Shad.Card>
        <Shad.Card>
          <Shad.CardHeader>
            <Shad.CardTitle className="text-sm">Total Revenue</Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent className="text-2xl font-semibold">
            {today.revenue}
          </Shad.CardContent>
        </Shad.Card>
        <Shad.Card>
          <Shad.CardHeader>
            <Shad.CardTitle className="text-sm">Cash Collected</Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent className="text-2xl font-semibold">
            {today.cash}
          </Shad.CardContent>
        </Shad.Card>
      </div>

      {/* =====================
          QUICK SHORTCUTS
      ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={() =>
            navigate({
              to: "/orders",
            })
          }
          variant="outline"
          className="h-14"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Orders
        </Button>

        <Button variant="outline" className="h-14">
          <CreditCard className="mr-2 h-5 w-5" />
          Payments
        </Button>

        {user?.role !== "CASHIER" && (
          <Button variant="outline" className="h-14">
            <FileBarChart className="mr-2 h-5 w-5" />
            Reports
          </Button>
        )}
      </div>
    </div>
  );
}
