import type { IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";
import {
  streamVoiceReply,
  generateVoiceCoaching,
} from "../services/voice.service.js";
import { AppError } from "../lib/errors.js";

// Compare by WORDS only: ignore case, spacing, and ALL punctuation, so a fix
// that just adds commas / a question mark / capitals (e.g. "hi do you love me"
// -> "Hi, do you love me?") is NOT treated as a real correction — speech-to-text
// simply drops punctuation, that's not the learner's mistake. Only genuine
// grammar or vocabulary changes make the correction line show. Apostrophes are
// kept (straightened first) so contraction fixes like "lets" -> "let's" count.
function normalizeForCompare(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'") // curly/modifier apostrophes -> straight
    .replace(/[^\p{L}\p{N}'\s]/gu, " ") // drop all other punctuation/symbols
    .replace(/\s+/g, " ")
    .trim();
}

const clientMessageSchema = z.object({
  type: z.enum(["client.interim", "client.final"]),
  text: z.string().default(""),
  level: z.string().default("B1"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .default([]),
});

export function attachVoiceWsServer(server: any) {
  const wss = new WebSocketServer({ server, path: "/ws/voice" });

  wss.on("connection", (socket: WebSocket, _req: IncomingMessage) => {
    let lastInterim = "";

    socket.send(JSON.stringify({ type: "server.ready" }));

    socket.on("message", async (raw: WebSocket.RawData) => {
      let parsed: z.infer<typeof clientMessageSchema> | null = null;
      try {
        parsed = clientMessageSchema.parse(JSON.parse(raw.toString()));
      } catch {
        socket.send(
          JSON.stringify({ type: "server.error", message: "Invalid message" }),
        );
        return;
      }

      if (parsed.type === "client.interim") {
        lastInterim = parsed.text || "";
        socket.send(
          JSON.stringify({ type: "server.interim_ack", text: lastInterim }),
        );
        return;
      }

      const finalText = (parsed.text || lastInterim || "").trim();
      if (!finalText) {
        socket.send(
          JSON.stringify({ type: "server.error", message: "Empty transcript" }),
        );
        return;
      }

      socket.send(JSON.stringify({ type: "assistant.start" }));

      try {
        // Collect the full spoken reply as it streams: the learning-card hint
        // needs to see Sophia's follow-up question so it can answer it.
        let replyText = "";
        for await (const delta of streamVoiceReply({
          message: finalText,
          level: parsed.level || "B1",
          history: parsed.history ?? [],
        })) {
          replyText += delta;
          socket.send(JSON.stringify({ type: "assistant.delta", text: delta }));
        }

        // Now that we have Sophia's reply, build the two-line card. It's a
        // nice-to-have: if it fails, swallow it (-> null) and never break the
        // turn. Sent BEFORE assistant.done because the client tears down its
        // message listener on done, so the card must arrive first.
        const coaching = await generateVoiceCoaching({
          message: finalText,
          reply: replyText,
          level: parsed.level || "B1",
          history: parsed.history ?? [],
        }).catch(() => null);
        if (coaching) {
          const changed =
            normalizeForCompare(coaching.corrected) !==
            normalizeForCompare(finalText);
          socket.send(
            JSON.stringify({
              type: "assistant.coaching",
              original: finalText,
              corrected: coaching.corrected,
              hints: coaching.hints,
              changed,
            }),
          );
        }

        socket.send(JSON.stringify({ type: "assistant.done" }));
      } catch (e: any) {
        // Forward the structured error so the client can tell a hard quota cap
        // apart from a transient glitch and show the right message + retry.
        const appError = e instanceof AppError ? e : null;
        socket.send(
          JSON.stringify({
            type: "server.error",
            code: appError?.code ?? "STREAM_FAILED",
            message: e?.message || "Streaming failed",
            retryAfterMs: appError?.retryAfterMs,
          }),
        );
      }
    });
  });

  return wss;
}

