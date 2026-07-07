/**
 * Application errors that carry an HTTP status and a stable machine-readable
 * `code`, so the error handler can turn them into a clean response and the
 * frontend can branch on the cause instead of parsing human text.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    opts: { status: number; code: string; retryAfterMs?: number },
  ) {
    super(message);
    this.name = "AppError";
    this.status = opts.status;
    this.code = opts.code;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

/**
 * The Gemini free tier's hard daily cap was hit (e.g. 20 requests/day). This is
 * NOT "the backend is down" — retrying now will keep failing until the quota
 * resets, so we surface it distinctly (HTTP 429) instead of a generic 500.
 */
export class QuotaExhaustedError extends AppError {
  constructor(retryAfterMs?: number) {
    super("AI daily quota exhausted. Please try again later.", {
      status: 429,
      code: "QUOTA_EXHAUSTED",
      retryAfterMs,
    });
    this.name = "QuotaExhaustedError";
  }
}
