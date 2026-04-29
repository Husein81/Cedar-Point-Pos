import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./theme-providers";
import { LocaleProvider } from "./locale-provider";
import { Toaster } from "@repo/ui";

export const queryClient = new QueryClient();
const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <LocaleProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </LocaleProvider>
  );
};

export default Providers;
