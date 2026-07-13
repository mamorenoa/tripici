import { Redirect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";

import { useCurrentUser } from "../../src/domain/auth/useCurrentUser";

// Gate for anonymous routes. If the user is already authenticated,
// bounce them to the main app instead of showing the login screen.
export default function AuthLayout() {
  const { t } = useTranslation();
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

  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: t("nav.signIn") }} />
      <Stack.Screen
        name="register"
        options={{ title: t("nav.createAccount") }}
      />
    </Stack>
  );
}
