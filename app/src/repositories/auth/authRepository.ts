import type { components } from "../../repositories/_generated/api";
import { apiRequest } from "../../lib/apiClient";

type UserRead = components["schemas"]["UserRead"];
type UserCreate = components["schemas"]["UserCreate"];

type LoginResponse = {
  access_token: string;
  token_type: string;
};

/**
 * Concrete auth repository — speaks HTTP to FastAPI-Users. Domain hooks
 * (`useLogin`, `useCurrentUser`, …) only know this surface.
 */
export const authRepository = {
  // FastAPI-Users login uses OAuth2 form payload (username + password).
  login: (email: string, password: string): Promise<LoginResponse> =>
    apiRequest<LoginResponse>("/auth/jwt/login", {
      method: "POST",
      formBody: { username: email, password },
    }),

  register: (input: UserCreate): Promise<UserRead> =>
    apiRequest<UserRead>("/auth/register", { method: "POST", body: input }),

  logout: (): Promise<unknown> =>
    apiRequest<unknown>("/auth/jwt/logout", { method: "POST" }),

  me: (): Promise<UserRead> => apiRequest<UserRead>("/users/me"),
};
