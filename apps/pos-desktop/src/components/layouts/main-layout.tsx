import AuthLayout from "./auth-layout";
import ClientLayout from "./client-layout";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  // TODO:Replace with actual authentication logic
  const isAuthenticated = true;

  if (isAuthenticated) {
    return <ClientLayout>{children}</ClientLayout>;
  }

  return <AuthLayout />;
};

export default MainLayout;
