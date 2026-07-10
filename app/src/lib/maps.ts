import { Linking, Platform } from "react-native";

/**
 * Open a location in the device's maps app / browser.
 *
 * If ``query`` already looks like a URL (e.g. a pasted Google Maps link
 * with an exact pin), it's opened as-is. Otherwise it's turned into a
 * Google Maps search URL — which works cross-platform with no API key.
 */
export function openInMaps(query: string) {
  const q = query.trim();
  if (!q) return;
  const url = /^https?:\/\//i.test(q)
    ? q
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

  if (Platform.OS === "web") {
    globalThis.window?.open(url, "_blank", "noopener,noreferrer");
  } else {
    Linking.openURL(url).catch(() => {
      // Best-effort: ignore if no handler.
    });
  }
}
