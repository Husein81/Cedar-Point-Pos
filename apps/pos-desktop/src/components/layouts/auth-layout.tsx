import { useState } from "react";
import { Shad, Separator, Button } from "@repo/ui";

const PIN_LENGTH = 4;

const AuthLayout = () => {
  const [pin, setPin] = useState("");

  const handleVerify = () => {
    if (pin.length !== PIN_LENGTH) return;

    // 🔐 TODO: call backend
    console.log("Verify PIN:", pin);
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-3 bg-background">
      {/* LEFT / BRAND */}
      <div className="hidden border-r md:flex flex-col justify-center items-center px-10">
        <img src="/assets/logo.png" alt="Logo" className="size-40 mb-6" />

        <h1 className="text-3xl font-bold tracking-tight text-center">
          Point<span className="text-primary">Verse</span>
        </h1>

        <p className="text-muted-foreground text-center mt-3 max-w-sm">
          Secure access using your personal PIN.
        </p>
      </div>

      {/* RIGHT / AUTH */}
      <div className="flex flex-col col-span-2 justify-center items-center px-6 md:px-10">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="md:hidden flex flex-col items-center mb-8">
            <img src="/assets/logo.png" alt="Logo" className="size-20 mb-3" />
            <h1 className="text-2xl font-bold">
              Point<span className="text-primary">Verse</span>
            </h1>
          </div>

          {/* Card */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-center mb-2">
              Enter Your PIN
            </h2>

            <p className="text-sm text-muted-foreground text-center mb-6">
              Please enter your {PIN_LENGTH}-digit PIN to continue
            </p>

            {/* PIN INPUT */}
            <div className="flex justify-center w-full">
              <Shad.InputOTP
                value={pin}
                onChange={setPin}
                maxLength={PIN_LENGTH}
                inputMode="numeric"
                autoFocus
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

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3">
              <Button
                className="w-full"
                disabled={pin.length !== PIN_LENGTH}
                onClick={handleVerify}
              >
                Verify PIN
              </Button>

              <Button variant="ghost" className="text-sm text-muted-foreground">
                Forgot PIN?
              </Button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            Secure access for authorized staff only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
