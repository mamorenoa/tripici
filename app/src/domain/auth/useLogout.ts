import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AUTH_TOKEN_KEY, secureStorage } from "../../lib/secureStorage";
import { authRepository } from "../../repositories/auth/authRepository";
import { currentUserQueryKey } from "./useCurrentUser";

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Best-effort call to the server; even if it fails (network, 401)
      // we still want to wipe the local token below.
      try {
        await authRepository.logout();
      } catch {
        /* ignore */
      }
      await secureStorage.deleteItem(AUTH_TOKEN_KEY);
    },
    onSuccess: () => {
      // Clear cached queries so the logged-out user doesn't see stale
      // trip lists from the previous session.
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
  });
}
