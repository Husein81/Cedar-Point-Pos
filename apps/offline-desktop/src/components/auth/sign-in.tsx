import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@repo/ui";
import { FormField } from "@/components/common/FormField";
import { useLogin } from "@/hooks/useAuth";
import { LoginSchema, type LoginInput } from "@/shared/schemas";

const SignIn = () => {
  const login = useLogin();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (value: LoginInput) => {
    await login.mutateAsync(value);
    navigate({ to: "/" });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col w-full min-h-screen justify-center items-center px-6"
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold">
            Cedar<span className="text-primary">Point</span>{" "}
            <span className="text-muted-foreground text-base font-normal">
              Offline
            </span>
          </h1>
        </div>

        {/* Card */}
        <div className="rounded-xl border space-y-4 bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-center mb-2">
            Sign in to POS
          </h2>

          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter your username and password to continue
          </p>

          <FormField
            label="Username"
            placeholder="Enter your username"
            registration={register("username")}
            error={errors.username}
            autoFocus
          />

          <FormField
            label="Password"
            placeholder="Enter your password"
            type="password"
            registration={register("password")}
            error={errors.password}
          />

          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="w-full"
              disabled={isSubmitting}
              isSubmitting={isSubmitting}
              type="submit"
            >
              Sign In
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Authorized staff access only.
        </p>
      </div>
    </form>
  );
};

export default SignIn;
