import { getApiBaseUrl } from "./api";

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
};

/**
 * Thin wrapper around `fetch` used by every repository. This is the only
 * place in the app that talks to `fetch` directly — repositories speak
 * through `apiRequest`, domain hooks speak through repositories.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const method = options.method ?? "GET";

  const res = await fetch(url, {
    method,
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  // Read body up-front (even on error) so error responses surface their
  // payload to the UI.
  const text = await res.text();
  const body = text ? safeJsonParse(text) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, body);
  }

  return body as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
