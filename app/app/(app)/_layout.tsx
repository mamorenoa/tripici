import { Redirect, Stack, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useCurrentUser } from "../../src/domain/auth/useCurrentUser";

// Gate for authenticated routes. While we're checking auth, show a
// spinner. If there's no user, send the user to /login — passing the
// intended path as ``redirect`` so the auth screens can come back to
// the right place after sign-in (needed for the invite-link flow).
export default function AppLayout() {
  const { data: user, isLoading } = useCurrentUser();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    const target = `/login?redirect=${encodeURIComponent(pathname)}`;
    return <Redirect href={target} />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Tripinci" }} />
      <Stack.Screen
        name="trips/new"
        options={{ title: "New trip", presentation: "modal" }}
      />
      {/* Title set dynamically inside TripDetailScreen via <Stack.Screen options=... /> */}
      <Stack.Screen name="trips/[id]/index" options={{ title: "Trip" }} />
      <Stack.Screen
        name="trips/[id]/expenses/new"
        options={{ title: "New expense", presentation: "modal" }}
      />
      <Stack.Screen
        name="trips/[id]/expenses/[expenseId]/edit"
        options={{ title: "Edit expense" }}
      />
      <Stack.Screen
        name="trips/[id]/members"
        options={{ title: "Members" }}
      />
      <Stack.Screen
        name="trips/[id]/stats"
        options={{ title: "Stats" }}
      />
      <Stack.Screen
        name="invite/[token]"
        options={{ title: "Invitation" }}
      />
    </Stack>
  );
}
