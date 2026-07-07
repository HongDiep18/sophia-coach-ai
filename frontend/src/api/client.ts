const getBaseUrl = () =>
  (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(
    /\/$/,
    "",
  );

/**
 * Error thrown for any non-2xx response. Carries the HTTP `status` plus, when
 * the backend sent a structured body, its machine-readable `code` (e.g.
 * "QUOTA_EXHAUSTED") and optional `retryAfterMs`. Callers branch on these
 * instead of pattern-matching the human message.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    opts: { status: number; code?: string; retryAfterMs?: number },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    // The backend sends JSON error bodies ({ error, code, retryAfterMs }); fall
    // back to the raw text/status when it isn't parseable.
    let message = text || `Request failed: ${response.status}`;
    let code: string | undefined;
    let retryAfterMs: number | undefined;
    try {
      const body = JSON.parse(text) as {
        error?: string;
        code?: string;
        retryAfterMs?: number;
      };
      if (body.error) message = body.error;
      code = body.code;
      retryAfterMs = body.retryAfterMs;
    } catch {
      // Non-JSON error body — keep the raw text as the message.
    }
    throw new ApiError(message, { status: response.status, code, retryAfterMs });
  }

  return response.json() as Promise<T>;
}
