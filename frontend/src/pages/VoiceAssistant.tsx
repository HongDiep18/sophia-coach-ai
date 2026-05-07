import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, MicOff, PlugZap, Send, Volume2 } from "lucide-react";
import { useSpeechPlayback } from "../hooks/useSpeechPlayback";

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function getWsBaseUrl() {
  const httpBase = (
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"
  )
    .replace(/\/$/, "")
    .trim();
  return httpBase.startsWith("https://")
    ? httpBase.replace(/^https:\/\//, "wss://")
    : httpBase.replace(/^http:\/\//, "ws://");
}

function extractFullSentences(buffer: string) {
  const parts = buffer.split(/(?<=[.!?])\s+/);
  if (parts.length <= 1) return { sentences: [], rest: buffer };
  const rest = parts.pop() ?? "";
  return { sentences: parts.filter(Boolean), rest };
}

export default function VoiceAssistant() {
  const speech = useSpeechPlayback();
  const Recognition = useMemo(() => getSpeechRecognition(), []);
  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const autoSendRef = useRef({ armed: false, sent: false, lastText: "" });
  const finalAccumRef = useRef("");

  const [level, setLevel] = useState("B1");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [wsStatus, setWsStatus] = useState("disconnected");

  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [assistantLive, setAssistantLive] = useState("");
  const [history, setHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore
      }
      try {
        wsRef.current?.close?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const canListen = Boolean(Recognition);

  const startListening = () => {
    if (!canListen || isThinking) return;
    setError("");
    setTranscript("");
    setFinalTranscript("");
    setAssistantLive("");
    autoSendRef.current = { armed: true, sent: false, lastText: "" };
    finalAccumRef.current = "";

    const rec = new Recognition();
    recognitionRef.current = rec;
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? "";
        if (result.isFinal) finalText += `${text} `;
        else interim += `${text} `;
      }
      if (interim) setTranscript(interim.trim());
      if (finalText)
        setFinalTranscript((prev) => `${prev} ${finalText}`.trim());
      if (finalText)
        finalAccumRef.current = `${finalAccumRef.current} ${finalText}`.trim();
      autoSendRef.current.lastText =
        `${finalAccumRef.current} ${interim}`.trim();

      try {
        if (wsRef.current?.readyState === WebSocket.OPEN && interim) {
          wsRef.current.send(
            JSON.stringify({
              type: "client.interim",
              text: interim.trim(),
              level,
              history: history.slice(-10),
            }),
          );
        }
      } catch {
        // ignore
      }
    };

    rec.onerror = (e: any) => {
      setError(e?.error ? `Mic error: ${e.error}` : "Mic error");
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      const shouldAutoSend =
        autoSendRef.current.armed && !autoSendRef.current.sent && !isThinking;
      const text = (autoSendRef.current.lastText || "").trim();
      if (shouldAutoSend && text) {
        autoSendRef.current.sent = true;
        // Fire-and-forget; errors are handled inside sendText.
        void sendText(text);
      }
    };

    try {
      rec.start();
      setIsListening(true);
    } catch {
      setError("Could not start microphone. Please allow mic permission.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    setIsListening(false);
  };

  const connectWs = () => {
    const base = getWsBaseUrl();
    const ws = new WebSocket(`${base}/ws/voice`);
    wsRef.current = ws;
    setWsStatus("connecting");

    ws.onopen = () => setWsStatus("connected");
    ws.onclose = () => setWsStatus("disconnected");
    ws.onerror = () => setWsStatus("error");

    return ws;
  };

  const sendText = async (text: string) => {
    const message = text.trim();
    if (!message || isThinking) return;
    setIsThinking(true);
    setError("");
    setAssistantLive("");

    try {
      const ws =
        wsRef.current && wsRef.current.readyState === WebSocket.OPEN
          ? wsRef.current
          : connectWs();

      const fullHistory = history.slice(-10);
      let liveBuffer = "";
      let fullText = "";

      const handleMessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "assistant.delta" && msg.text) {
            liveBuffer += msg.text;
            fullText += msg.text;
            setAssistantLive(fullText);

            const extracted = extractFullSentences(liveBuffer);
            for (const sentence of extracted.sentences) {
              speech.enqueue(sentence, 0.75, "en-US");
            }
            liveBuffer = extracted.rest;
          }

          if (msg.type === "assistant.done") {
            const merged = fullText.trim();
            setAssistantText(merged);
            setHistory((prev) => [
              ...prev,
              { role: "user", content: message },
              { role: "assistant", content: merged },
            ]);
            ws.removeEventListener("message", handleMessage);
            setIsThinking(false);
          }

          if (msg.type === "server.error") {
            setError(msg.message || "Streaming error");
            ws.removeEventListener("message", handleMessage);
            setIsThinking(false);
          }
        } catch {
          // ignore
        }
      };

      ws.addEventListener("message", handleMessage);

      if (ws.readyState !== WebSocket.OPEN) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error("WS timeout")), 3000);
          ws.addEventListener(
            "open",
            () => {
              clearTimeout(t);
              resolve();
            },
            { once: true },
          );
        });
      }

      ws.send(
        JSON.stringify({
          type: "client.final",
          text: message,
          level,
          history: fullHistory,
        }),
      );
    } catch {
      setError(
        "Could not start live stream. Please start backend and refresh the page.",
      );
      setIsThinking(false);
    }
  };

  const sendFromVoice = async () => {
    const message = (finalTranscript || transcript || "").trim();
    autoSendRef.current.sent = true;
    await sendText(message);
  };

  const currentCaptured = (finalTranscript || transcript || "").trim();

  return (
    <section className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Voice Assistant (Phase 2 stream)
        </h2>
        <p className="text-sm text-slate-500">
          Push-to-talk + streaming reply: you’ll hear the first sentence fast.
        </p>
      </header>

      {!canListen ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your browser does not support speech recognition. Use Chrome (desktop)
          or Android Chrome. You can still use normal chat at{" "}
          <span className="font-mono">/chat</span>.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              disabled={isThinking || isListening}
            >
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium ${
                wsStatus === "connected"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : wsStatus === "connecting"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
              title="Backend streaming connection"
            >
              <PlugZap className="h-3 w-3" />
              {wsStatus}
            </div>
            {assistantText ? (
              <button
                type="button"
                onClick={() => speech.speak(assistantText, 0.75, "en-US")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Replay answer
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              You said (transcript)
            </p>
            <div className="min-h-14 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {currentCaptured || (
                <span className="text-slate-400">
                  Tap mic and start speaking…
                </span>
              )}
            </div>
            {isListening ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Listening… tap again to stop.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={!canListen || isThinking}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                isListening
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop mic
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Start mic
                </>
              )}
            </button>

            <button
              type="button"
              onClick={sendFromVoice}
              disabled={!currentCaptured || isThinking || isListening}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {isThinking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send
                </>
              )}
            </button>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              Coach answer
            </p>
            <div className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              {assistantLive || assistantText ? (
                <span>{assistantLive || assistantText}</span>
              ) : (
                <span className="text-slate-400">
                  Your coach will reply here.
                </span>
              )}
            </div>
            {speech.state !== "idle" ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Use Stop/Pause/Resume in the header or in Chat controls.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
