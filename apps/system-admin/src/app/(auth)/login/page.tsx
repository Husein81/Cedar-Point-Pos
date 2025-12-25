"use client";

import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Button, Input, Label } from "@repo/ui";
import { useEffect } from "react";
import { useLogin } from "@/hooks/auth";

const SystemAdminSignIn = () => {
  const router = useRouter();
  const login = useLogin();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {

        await login.mutateAsync({
          email: value.email,
          password: value.password,
        });
      } catch (error) {
        console.error("Verification error:", error);
      }
    },
  });
  // Handle successful login redirect
  useEffect(() => {
    if (login.isSuccess) {
      router.replace("/");
    }
  }, [login.isSuccess, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-screen justify-center items-center px-6"
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-xl border space-y-4 bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-center mb-2">
            System Admin Login
          </h2>

          <p className="text-sm text-muted-foreground text-center mb-6">
            Sign in using your admin email and password
          </p>

          {login.isError && (
            <p className="text-sm text-red-500 text-center">
              {login.error?.message || "Invalid credentials"}
            </p>
          )}

          {/* EMAIL INPUT */}
          <form.Field name="email">
            {(field) => (
              <div>
                <Label htmlFor={field.name} className="mb-2 block">
                  Email
                </Label>

                <Input
                  id={field.name}
                  type="email"
                  placeholder="admin@company.com"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            )}
          </form.Field>

          {/* PASSWORD INPUT */}
          <form.Field name="password">
            {(field) => (
              <div>
                <Label htmlFor={field.name} className="mb-2 block">
                  Password
                </Label>

                <Input
                  id={field.name}
                  type="password"
                  placeholder="Enter your password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            )}
          </form.Field>

          {/* Actions */}
          <form.Subscribe selector={(state) => [state.canSubmit]}>
            {([canSubmit, isSubmitting]) => (
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  className="w-full"
                  disabled={!canSubmit || isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              </div>
            )}
          </form.Subscribe>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Restricted access · System administrators only
        </p>
      </div>
    </form>
  );
};

export default SystemAdminSignIn;
