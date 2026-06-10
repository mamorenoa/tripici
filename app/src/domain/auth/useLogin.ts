import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AUTH_TOKEN_KEY, secureStorage } from "../../lib/secureStorage";
import { authRepository } from "../../repositories/auth/authRepository";
import { currentUserQueryKey } from "./useCurrentUser";

type Credentials = { email: string; password: string };

/**
 * Logs in, stores the token, and primes the ``currentUser`` cache with
 * a fresh ``/users/me`` response. Priming (vs. invalidating) avoids the
 * stale-null race where a protected-route layout reads the old cache
 * before the refetch lands and bounces the user back to /login.
 */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: Credentials) => {
      const { access_token } = await authRepository.login(email, password);
      await secureStorage.setItem(AUTH_TOKEN_KEY, access_token);
      // The token is now in storage, so `apiRequest` will attach it.
      const user = await authRepository.me();
      queryClient.setQueryData(currentUserQueryKey, user);
      return access_token;
    },
  });
}
