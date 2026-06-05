import { Platform } from 'react-native';

/**
 * Returns the base URL the app should use to reach the backend.
 *
 * Order of precedence:
 *  1. EXPO_PUBLIC_API_URL — set this in .env.local when running on a
 *     physical device (use the host machine's LAN IP).
 *  2. Android emulator — reaches the host's localhost via the special
 *     alias 10.0.2.2.
 *  3. Everything else (web, iOS simulator) — plain localhost.
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
}
