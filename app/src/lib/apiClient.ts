import { getApiBaseUrl } from "./api";
import { AUTH_TOKEN_KEY, secureStorage } from "./secureStorage";

/**
 * Error thrown by `apiRequest` when the response is not 2xx. Carries the
 * HTTP status and (if available) the parsed response body so callers can
 * surface meaningful messages.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /**
   * Override the default content-type / body handling. Used by the auth
   * login endpoint which expects `application/x-www-form-urlencoded`.
   */
  formBody?: Record<string, string>;
};

/**
 * Thin wrapper around `fetch` used by every repository. This is the only
 * place in the app that talks to `fetch` directly — repositories speak
 * through `apiRequest`, domain hooks speak through repositories.
 *
 * If a token is stored in `secureStorage`, it's automatically attached as
 * `Authorization: Bearer <token>`. Endpoints that don't need auth (like
 * `/auth/jwt/login`) tolerate the unused header.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const method = options.method ?? "GET";

  const headers: Record<string, string> = {};

  const token = await secureStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (options.formBody) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(options.formBody).toString();
  } else if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(url, { method, headers, body });

  // Read the body up-front (even on error) so error responses surface
  // their payload to the UI.
  const text = await res.text();
  const parsed = text ? safeJsonParse(text) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, parsed);
  }

  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
