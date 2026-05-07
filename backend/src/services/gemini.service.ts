import { env } from "../config/env.js";

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
          throw new Error(`Gemini quota exhausted (hard limit). ${errorText}`);
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
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${env.GEMINI_API_KEY}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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
          throw new Error(`Gemini quota exhausted (hard limit). ${errorText}`);
        }
        const err = new Error(
          `Gemini stream error (${model}): ${response.status} ${errorText}`,
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by blank lines.
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const lines = frame.split("\n");
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
      }
      return;
    } catch (error) {
      lastError = error as Error;
      if (i === models.length - 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw (
    lastError ?? new Error("Gemini stream failed for all configured models")
  );
}
