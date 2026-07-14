import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/context/themes";
import { NetworkProvider } from "@/context/NetworkContext";
import { Toaster } from "@repo/ui";
import { queryClient } from "@/lib/queryClient";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
};

export default Providers;
