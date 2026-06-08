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
 * Side-effects on success: token stored, current-user query invalidated.
 */
export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      // FastAPI-Users `BaseUserCreate` exposes the admin flags as
      // nullable in the OpenAPI schema; we just pass null and let the
      // server choose the defaults.
      await authRepository.register({
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
      return access_token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
  });
}
