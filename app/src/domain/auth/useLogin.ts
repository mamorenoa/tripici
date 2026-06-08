import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AUTH_TOKEN_KEY, secureStorage } from "../../lib/secureStorage";
import { authRepository } from "../../repositories/auth/authRepository";
import { currentUserQueryKey } from "./useCurrentUser";

type Credentials = { email: string; password: string };

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: Credentials) => {
      const { access_token } = await authRepository.login(email, password);
      await secureStorage.setItem(AUTH_TOKEN_KEY, access_token);
      return access_token;
    },
    onSuccess: () => {
      // Forces `useCurrentUser` to refetch with the new token.
      queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    },
  });
}
