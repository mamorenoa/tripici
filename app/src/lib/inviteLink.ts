import { Platform } from "react-native";

/**
 * Build the shareable URL for an invite token. On web we use the
 * current origin so the link works as a real URL the recipient can
 * click. On native we use the ``tripinci://`` scheme configured in
 * ``app.json`` (slice 3) — Expo Router resolves deep links to the
 * matching route.
 */
export function buildInviteUrl(token: string): string {
  if (Platform.OS === "web") {
    const origin =
      typeof globalThis.location !== "undefined"
        ? globalThis.location.origin
        : "";
    return `${origin}/invite/${token}`;
  }
  return `tripinci://invite/${token}`;
}
