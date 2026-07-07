import { env } from "../config/env.js";
import { QuotaExhaustedError } from "../lib/errors.js";

type GeminiPart = { text: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

function extractTextDelta(data: GeminiResponse): string {
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * Parse one SSE frame (which may contain several `data:` lines) and yield any
 * text deltas. Line endings are normalized because Gemini separates frames
 * with CRLF (`\r\n\r\n`), not `\n\n`.
 */
function* emitSseFrame(frame: string): Generator<string, void, void> {
  const lines = frame.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice("data:".length).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const json = JSON.parse(payload) as GeminiResponse;
      const delta = extractTextDelta(json);
      if (delta) yield delta;
    } catch {
      // ignore invalid JSON frames
    }
  }
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const first = withoutFence.indexOf("{");
  const last = withoutFence.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    throw new Error("Model did not return JSON object");
  }
  return withoutFence.slice(first, last + 1);
}

function getModelCandidates(): string[] {
  const fallbacks = (env.GEMINI_FALLBACK_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [env.GEMINI_MODEL, ...fallbacks].filter(
    (m, i, arr) => arr.indexOf(m) === i,
  );
}

function isRetryableModelBusy(status: number, errorText: string): boolean {
  if (status === 503 || status === 429) return true;
  const t = errorText.toLowerCase();
  return (
    t.includes("unavailable") ||
    t.includes("high demand") ||
    t.includes("resource exhausted")
  );
}

function isHardQuotaExceeded(errorText: string): boolean {
  const t = errorText.toLowerCase();
  return (
    t.includes("quota exceeded") &&
    (t.includes("limit: 0") || t.includes("free_tier"))
  );
}

/**
 * Build the quota error to throw. The raw Gemini JSON blob is logged here for
 * diagnostics but never returned to the client — only the distilled 429 is.
 */
function quotaError(errorText: string): QuotaExhaustedError {
  console.error("[gemini] hard quota exceeded:", errorText);
  return new QuotaExhaustedError(parseRetryDelayMs(errorText) ?? undefined);
}

function parseRetryDelayMs(errorText: string): number | null {
  const m = errorText.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (!m) return null;
  const sec = Number(m[1]);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return Math.min(5000, Math.round(sec * 1000));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type EmbeddingResponse = {
  embedding?: { values?: number[] };
};

/**
 * Turn a piece of text into an embedding vector using Gemini's embedding
 * model (env.EMBEDDING_MODEL, default gemini-embedding-001). The vector has
 * env.EMBEDDING_DIM numbers, which MUST match the vector(N) column in
 * knowledge_chunks. Vectors are L2-normalized: Google only normalizes the
 * full 3072-dim output automatically, so we normalize reduced dimensions
 * ourselves — this keeps cosine similarity well-behaved.
 *
 * taskType tunes the embedding for its purpose: use RETRIEVAL_DOCUMENT when
 * storing knowledge, RETRIEVAL_QUERY when embedding a user's question.
 */
export async function embedText(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT",
): Promise<number[]> {
  const model = env.EMBEDDING_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${env.GEMINI_API_KEY}`;

  const maxAttempts = 4;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: env.EMBEDDING_DIM,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (isHardQuotaExceeded(errorText)) {
          throw quotaError(errorText);
        }
        const err = new Error(
          `Gemini embedding error (${model}): ${response.status} ${errorText}`,
        );
        if (
          attempt < maxAttempts - 1 &&
          isRetryableModelBusy(response.status, errorText)
        ) {
          const delay = parseRetryDelayMs(errorText) ?? 600 * (attempt + 1);
          await sleep(delay);
          lastError = err;
          continue;
        }
        throw err;
      }

      const data = (await response.json()) as EmbeddingResponse;
      const values = data.embedding?.values;
      if (!values || values.length === 0) {
        throw new Error("Gemini embedding returned no values");
      }
      if (values.length !== env.EMBEDDING_DIM) {
        throw new Error(
          `Embedding dimension mismatch: got ${values.length}, expected ${env.EMBEDDING_DIM}`,
        );
      }

      const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
      return norm > 0 ? values.map((v) => v / norm) : values;
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts - 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("Gemini embedding failed");
}

export async function generateStructuredJson<T>(prompt: string): Promise<T> {
  const models = getModelCandidates();
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (isHardQuotaExceeded(errorText)) {
          throw quotaError(errorText);
        }
        const err = new Error(
          `Gemini error (${model}): ${response.status} ${errorText}`,
        );
        const shouldRetry =
          i < models.length - 1 &&
          isRetryableModelBusy(response.status, errorText);
        if (shouldRetry) {
          const delay = parseRetryDelayMs(errorText) ?? 600;
          await sleep(delay);
          lastError = err;
          continue;
        }
        throw err;
      }

      const data = (await response.json()) as GeminiResponse;
      const text = extractTextDelta(data);
      const jsonString = extractJsonObject(text);
      return JSON.parse(jsonString) as T;
    } catch (error) {
      lastError = error as Error;
      if (i === models.length - 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("Gemini failed for all configured models");
}

export async function* generateTextStream(
  prompt: string,
): AsyncGenerator<string, void, void> {
  const models = getModelCandidates();
  // A 503 "high demand" on Gemini is usually transient, so retry the SAME
  // model a few times with backoff before falling back to the next model.
  const maxAttemptsPerModel = 3;
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${env.GEMINI_API_KEY}`;
    let advanceToNextModel = false;

    for (
      let attempt = 0;
      attempt < maxAttemptsPerModel && !advanceToNextModel;
      attempt += 1
    ) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      let started = false;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5 },
          }),
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text().catch(() => "");
          if (isHardQuotaExceeded(errorText)) {
            throw quotaError(errorText);
          }
          lastError = new Error(
            `Gemini stream error (${model}): ${response.status} ${errorText}`,
          );

          if (isRetryableModelBusy(response.status, errorText)) {
            // Overloaded: retry the same model, then fall back.
            if (attempt < maxAttemptsPerModel - 1) {
              await sleep(parseRetryDelayMs(errorText) ?? 700 * (attempt + 1));
              continue;
            }
            advanceToNextModel = true;
            continue;
          }

          // Non-retryable HTTP error: fall back to the next model, if any.
          advanceToNextModel = true;
          continue;
        }

        // Success — stream to completion.
        started = true;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line. Gemini uses CRLF, so
          // split on either \r\n\r\n or \n\n.
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            yield* emitSseFrame(frame);
          }
        }
        // Flush any trailing frame that wasn't terminated by a blank line.
        if (buffer.trim()) {
          yield* emitSseFrame(buffer);
        }
        return;
      } catch (error) {
        // A hard quota cap will keep failing — surface it immediately.
        if (error instanceof QuotaExhaustedError) throw error;
        // Failed after we already started yielding: don't silently swallow.
        if (started) throw error;

        lastError = error as Error;
        if (attempt < maxAttemptsPerModel - 1) {
          await sleep(700 * (attempt + 1));
          continue;
        }
        advanceToNextModel = true;
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  throw (
    lastError ?? new Error("Gemini stream failed for all configured models")
  );
}

