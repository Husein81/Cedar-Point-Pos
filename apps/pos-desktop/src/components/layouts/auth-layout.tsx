import SignIn from "../auth/sign-in";

const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-3 bg-background">
      {/* LEFT / BRAND */}
      <div className="hidden border-r md:flex flex-col justify-center items-center px-10">
        <img src="/assets/logo.png" alt="Logo" className="size-40 mb-6" />

        <h1 className="text-3xl font-bold tracking-tight text-center">
          Point<span className="text-primary">Verse</span>
        </h1>

        <p className="text-muted-foreground text-center mt-3 max-w-sm">
          Secure access using your personal credentials.
        </p>
      </div>

      {/* RIGHT / AUTH */}
      <SignIn />
    </div>
  );
};

export default AuthLayout;
