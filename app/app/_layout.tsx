import "../global.css";
// Side-effect import: initialises the shared i18next instance before any
// screen renders.
import "../src/lib/i18n";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useHydrateLanguage } from "../src/domain/settings/useLanguage";
import { queryClient } from "../src/lib/queryClient";

// Keep the native splash visible until the fonts are loaded so the
// first painted screen already uses Inter, not the system fallback.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* preventAutoHide is best-effort; ignore failures (e.g. on web). */
});

export default function RootLayout() {
  const isWeb = Platform.OS === "web";

  // Apply a persisted language preference over the device-locale default.
  useHydrateLanguage();

  // On web, Inter is loaded via CSS @font-face in global.css (Google Fonts
  // CDN). useFonts is native-only: Expo's web export puts font assets at
  // `assets/node_modules/…` which wrangler excludes during deploy.
  const [fontsLoaded, fontError] = useFonts(
    isWeb
      ? {}
      : { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold }
  );

  useEffect(() => {
    if (isWeb || fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isWeb, fontsLoaded, fontError]);

  if (!isWeb && !fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </QueryClientProvider>
  );
}
