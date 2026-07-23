import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/context/themes";
import { Toaster } from "@repo/ui";
import { queryClient } from "@/lib/queryClient";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default Providers;
