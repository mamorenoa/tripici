/**
 * Cross-platform storage abstraction.
 *
 * - On native (iOS / Android), uses `expo-secure-store` which stores
 *   values in the device's secure enclave (Keychain / Keystore).
 * - On web, falls back to `localStorage`. This is NOT actually secure
 *   against XSS — it's good enough for local dev. Production web should
 *   move to httpOnly cookies or a hardened scheme.
 *
 * All methods are async so the same call site works on every platform.
 */
import { Platform } from "react-native";

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

// Lazy access so we don't import the native module on web.
function nativeStore(): SecureStoreModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-secure-store") as SecureStoreModule;
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return Promise.resolve(globalThis.localStorage?.getItem(key) ?? null);
    }
    return nativeStore().getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await nativeStore().setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await nativeStore().deleteItemAsync(key);
  },
};

// Single source of truth for the storage key the auth flow uses.
export const AUTH_TOKEN_KEY = "tripinci.token";
