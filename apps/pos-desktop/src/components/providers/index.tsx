import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./theme-providers";
import { Toaster } from "@repo/ui";
import { DatabaseProvider } from "@/components/provider/DatabaseProvider";

export const queryClient = new QueryClient();
const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        {/* DatabaseProvider initialises RxDB and starts background sync.
            branchId is read automatically from useBranchStore. */}
        <DatabaseProvider>{children}</DatabaseProvider>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default Providers;
