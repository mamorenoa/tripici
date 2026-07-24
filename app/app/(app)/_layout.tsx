import { Redirect, Stack, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";

import { useCurrentUser } from "../../src/domain/auth/useCurrentUser";

// Anchor every route in this group to the trips list. Without this, opening
// a shared link (e.g. /trips/<id>) or reloading a deep page starts with an
// empty history: the stack header renders no back arrow and the user is
// stranded with no way to reach the trip list.
export const unstable_settings = {
  initialRouteName: "index",
};

// Gate for authenticated routes. While we're checking auth, show a
// spinner. If there's no user, send the user to /login — passing the
// intended path as ``redirect`` so the auth screens can come back to
// the right place after sign-in (needed for the invite-link flow).
export default function AppLayout() {
  const { t } = useTranslation();
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
      {/* Home renders its own branded top bar (redesign R2). */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="stats" options={{ title: t("nav.allTrips") }} />
      <Stack.Screen
        name="trips/new"
        options={{ title: t("nav.newTrip"), presentation: "modal" }}
      />
      {/* Title set dynamically inside TripDetailScreen via <Stack.Screen options=... /> */}
      <Stack.Screen name="trips/[id]/index" options={{ title: t("nav.trip") }} />
      <Stack.Screen
        name="trips/[id]/edit"
        options={{ title: t("nav.editTrip"), presentation: "modal" }}
      />
      <Stack.Screen
        name="trips/[id]/expenses/new"
        options={{ title: t("nav.newExpense"), presentation: "modal" }}
      />
      <Stack.Screen
        name="trips/[id]/expenses/[expenseId]/index"
        options={{ title: t("nav.expense") }}
      />
      <Stack.Screen
        name="trips/[id]/expenses/[expenseId]/edit"
        options={{ title: t("nav.editExpense") }}
      />
      <Stack.Screen
        name="trips/[id]/plans/new"
        options={{ title: t("nav.newPlan"), presentation: "modal" }}
      />
      {/* Title set dynamically inside PlanDetailScreen via <Stack.Screen options=... /> */}
      <Stack.Screen
        name="trips/[id]/plans/[planId]/edit"
        options={{ title: t("nav.editPlan") }}
      />
      <Stack.Screen name="trips/[id]/members" options={{ title: t("nav.members") }} />
      <Stack.Screen name="trips/[id]/stats" options={{ title: t("nav.stats") }} />
      <Stack.Screen name="invite/[token]" options={{ title: t("nav.invitation") }} />
    </Stack>
  );
}
