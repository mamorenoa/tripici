import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useCurrentUser } from "../../src/domain/auth/useCurrentUser";

// Gate for authenticated routes. While we're checking auth, show a
// spinner. If there's no user, send the user to /login. Otherwise,
// render the Stack with the actual screens.
export default function AppLayout() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Tripinci" }} />
      <Stack.Screen
        name="trips/new"
        options={{ title: "New trip", presentation: "modal" }}
      />
    </Stack>
  );
}
