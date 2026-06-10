import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AUTH_TOKEN_KEY, secureStorage } from "../../lib/secureStorage";
import { authRepository } from "../../repositories/auth/authRepository";
import { currentUserQueryKey } from "./useCurrentUser";

type RegisterInput = {
  email: string;
  password: string;
  display_name: string;
};

/**
 * Registers a new user, then immediately logs in to obtain the token.
 * Side-effects on success: token stored, current-user query primed
 * with the freshly-registered user.
 *
 * We populate the cache directly via ``setQueryData`` instead of
 * invalidating: if we only invalidate, the next render that depends
 * on ``useCurrentUser`` may briefly see the stale ``null`` and route
 * decisions (e.g., redirecting back to /login from a protected route)
 * fire before the refetch settles.
 */
export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      // FastAPI-Users `BaseUserCreate` exposes the admin flags as
      // nullable in the OpenAPI schema; we just pass null and let the
      // server choose the defaults.
      const user = await authRepository.register({
        email: input.email,
        password: input.password,
        display_name: input.display_name,
        is_active: null,
        is_superuser: null,
        is_verified: null,
      });
      const { access_token } = await authRepository.login(
        input.email,
        input.password,
      );
      await secureStorage.setItem(AUTH_TOKEN_KEY, access_token);
      // Prime the cache so the immediately-following navigation sees
      // the authenticated user. No race against an async refetch.
      queryClient.setQueryData(currentUserQueryKey, user);
      return access_token;
    },
  });
}
