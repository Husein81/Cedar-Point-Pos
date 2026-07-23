import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@repo/ui";
import SignIn from "@/components/auth/sign-in";
import Setup from "@/components/auth/setup";
import { useBootstrap } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { data, isLoading } = useBootstrap();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icon name="LoaderCircle" className="animate-spin" />
      </div>
    );
  }

  // First launch: no users yet → owner setup. Otherwise: sign in.
  return data?.hasUsers ? <SignIn /> : <Setup />;
}
