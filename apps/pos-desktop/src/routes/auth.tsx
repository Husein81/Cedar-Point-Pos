import SignIn from "@/components/auth/sign-in";
import logo from "/assets/logo.png";
import { useAuthStore } from "@/store/authStore";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@repo/ui";

export const Route = createFileRoute("/auth")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/orders" });
    }
  }, [isAuthenticated]);

  return (
    <div className="w-full h-screen grid grid-cols-1 md:grid-cols-3 bg-background">
      {/* LEFT / BRAND */}
      <div className="hidden md:flex flex-col gap-2 justify-center border-r items-center px-6">
        <div className="bg-primary rounded-md p-2">
          <img src={logo} alt="Logo" className="size-40" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-center">
          Cedar <span className="text-primary">Point</span>
        </h1>

        <p className="text-muted-foreground text-center max-w-sm">
          Secure access using your personal credentials.
        </p>
        <Button>Contact Support</Button>
      </div>

      {/* RIGHT / AUTH */}
      <SignIn />
    </div>
  );
}
