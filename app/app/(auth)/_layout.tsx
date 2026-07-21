import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useCurrentUser } from "../../src/domain/auth/useCurrentUser";

// Gate for anonymous routes. If the user is already authenticated,
// bounce them to the main app instead of showing the login screen.
export default function AuthLayout() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/" />;
  }

  // No native header on auth — the screens own the top with their own
  // full-bleed branded layout (redesign R1).
  return <Stack screenOptions={{ headerShown: false }} />;
}
