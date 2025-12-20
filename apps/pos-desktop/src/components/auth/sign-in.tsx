import { useLogin } from "@/hooks/auth";
import { Button, Input, Label, Shad } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

const PIN_LENGTH = 4;

const SignIn = () => {
  const login = useLogin();
  const form = useForm({
    defaultValues: {
      username: "",
      pin: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await login.mutateAsync({
          username: value.username,
          password: value.pin,
        });
      } catch (error) {
        console.error("Verification error:", error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col col-span-2 justify-center items-center px-6 md:px-10"
    >
      <div className="w-full max-w-md">
        {/* Mobile brand */}
        <div className="md:hidden flex flex-col items-center mb-8">
          <img src="/assets/logo.png" alt="Logo" className="size-20 mb-3" />
          <h1 className="text-2xl font-bold">
            Point<span className="text-primary">Verse</span>
          </h1>
        </div>

        {/* Card */}
        <div className="rounded-xl border space-y-4 bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-center mb-2">
            Sign in to POS
          </h2>

          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter your username and {PIN_LENGTH}-digit PIN
          </p>

          {/* USERNAME INPUT */}
          <form.Field name="username">
            {(field) => (
              <div>
                <Label htmlFor={field.name} className="mb-2 block">
                  Username
                </Label>

                <Input
                  id="username"
                  placeholder="e.g. cashier01"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            )}
          </form.Field>

          {/* PIN INPUT */}
          <form.Field name="pin">
            {(field) => (
              <div className="flex justify-center w-full">
                <Shad.InputOTP
                  value={field.state.value}
                  onChange={field.handleChange}
                  maxLength={PIN_LENGTH}
                  inputMode="numeric"
                >
                  <Shad.InputOTPGroup className="justify-center">
                    {Array.from({ length: PIN_LENGTH }).map((_, index) => (
                      <Shad.InputOTPSlot
                        key={index}
                        index={index}
                        className="text-xl"
                      />
                    ))}
                  </Shad.InputOTPGroup>
                </Shad.InputOTP>
              </div>
            )}
          </form.Field>

          {/* Actions */}
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  className="w-full"
                  disabled={!canSubmit || isSubmitting}
                  type="submit"
                >
                  Verify & Continue
                </Button>

                <Button
                  variant="ghost"
                  className="text-sm text-muted-foreground"
                >
                  Forgot PIN?
                </Button>
              </div>
            )}
          </form.Subscribe>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Authorized staff access only.
        </p>
      </div>
    </form>
  );
};
export default SignIn;
