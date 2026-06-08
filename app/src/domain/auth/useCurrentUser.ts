import { useQuery } from "@tanstack/react-query";

import { ApiError } from "../../lib/apiClient";
import { AUTH_TOKEN_KEY, secureStorage } from "../../lib/secureStorage";
import { authRepository } from "../../repositories/auth/authRepository";
import type { User } from "./types";

export const currentUserQueryKey = ["currentUser"] as const;

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: currentUserQueryKey,
    queryFn: async () => {
      // Skip the roundtrip when there's no token at all.
      const token = await secureStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return null;
      try {
        return await authRepository.me();
      } catch (e) {
        // Expired or invalid token → treat as logged out.
        if (e instanceof ApiError && e.status === 401) {
          await secureStorage.deleteItem(AUTH_TOKEN_KEY);
          return null;
        }
        throw e;
      }
    },
    // Reduce friction: keep the result fresh; refetch on focus.
    staleTime: 60_000,
    retry: false,
  });
}
