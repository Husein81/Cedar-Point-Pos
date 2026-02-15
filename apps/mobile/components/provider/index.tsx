import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View } from "react-native";

export const queryClient = new QueryClient();

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <View>{children}</View>
    </QueryClientProvider>
  );
};
export default Provider;
