import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/context/theme-provider";
import { Toaster } from "@repo/ui";
import { NetworkStatusToast } from "../network-status-toast";

export const queryClient = new QueryClient();
const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default Providers;
