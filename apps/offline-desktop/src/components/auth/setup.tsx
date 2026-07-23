// First-run flow: create the owner account. Shown only while no users exist.

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@repo/ui";
import { FormField } from "@/components/common/FormField";
import { useSetup } from "@/hooks/useAuth";
import { UserRole } from "@/shared/enums";
import { UserSchema, type UserInput } from "@/shared/schemas";

const Setup = () => {
  const setup = useSetup();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserInput>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      role: UserRole.OWNER,
    },
  });

  const onSubmit = async (value: UserInput) => {
    await setup.mutateAsync(value);
    navigate({ to: "/settings" });
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

        <div className="rounded-xl border space-y-4 bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-center mb-2">
            Welcome! Let&apos;s set up your POS
          </h2>

          <p className="text-sm text-muted-foreground text-center mb-6">
            Create the owner account for this terminal
          </p>

          <FormField
            label="Your Name"
            placeholder="e.g. John Smith"
            registration={register("name")}
            error={errors.name}
            autoFocus
          />

          <FormField
            label="Username"
            placeholder="Choose a username"
            registration={register("username")}
            error={errors.username}
          />

          <FormField
            label="Password"
            placeholder="Choose a password"
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
              Create Owner Account
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          You can add employees later in Settings.
        </p>
      </div>
    </form>
  );
};

export default Setup;
