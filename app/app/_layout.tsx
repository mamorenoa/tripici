import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { queryClient } from "../src/lib/queryClient";

// Root layout. Provides the shared TanStack QueryClient and mounts the
// two top-level Expo Router groups. The actual gating between
// authenticated/anonymous flows lives inside each group's _layout.
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </QueryClientProvider>
  );
}
