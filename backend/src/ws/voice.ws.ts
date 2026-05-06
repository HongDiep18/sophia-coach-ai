import type { IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";
import { streamChatEnglishReply } from "../services/chat.service.js";

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
        for await (const delta of streamChatEnglishReply({
          message: finalText,
          level: parsed.level || "B1",
          history: parsed.history ?? [],
        })) {
          socket.send(JSON.stringify({ type: "assistant.delta", text: delta }));
        }
        socket.send(JSON.stringify({ type: "assistant.done" }));
      } catch (e: any) {
        socket.send(
          JSON.stringify({
            type: "server.error",
            message: e?.message || "Streaming failed",
          }),
        );
      }
    });
  });

  return wss;
}

