import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { queryClient } from "../src/lib/queryClient";

// Root layout for Expo Router. Wraps every screen with the shared
// QueryClient (TanStack Query) and provides a native Stack navigator.
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Tripinci" }} />
        <Stack.Screen
          name="trips/new"
          options={{ title: "New trip", presentation: "modal" }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
