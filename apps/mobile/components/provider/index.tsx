import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import { View } from "react-native";

const Provider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }} className="bg-background">
        {children}
      </View>
    </QueryClientProvider>
  );
};

export default Provider;
