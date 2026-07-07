import {
  Ear,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  PlugZap,
  RefreshCw,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

// Turn a backend error code (or raw message) into a short, friendly line the
// learner can act on.
function friendlyError(code?: string, message?: string) {
  switch (code) {
    case "QUOTA_EXHAUSTED":
      return "Sophia has reached today's free AI limit. Please try again later.";
    case "STREAM_FAILED":
      return "The coach hit a problem while replying. Please try again.";
    default:
      return message || "Something went wrong. Please try again.";
  }
}

// Guard against empty / stray-noise transcripts (a stray "uh", a single
// character, pure punctuation) so we don't send junk to the coach.
function isMeaningfulUtterance(text: string) {
  const t = text.trim();
  if (t.length < 2) return false;
  if (!/[a-zA-Z0-9]/.test(t)) return false;
  return true;
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

  // Refs mirror the latest state so callbacks created once (mic handlers, the
  // WS message listener) never read stale values from an old render.
  const isThinkingRef = useRef(false);
  const levelRef = useRef("B1");
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  // The last message we tried to send, so the Retry button can resend it.
  const lastMessageRef = useRef("");

  // Level is fixed at B1 while the selector UI is disabled; kept so the prompt
  // and WS messages still carry a level.
  const [level] = useState("B1");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  // Gentle, non-alarming notice (e.g. "I didn't catch that"), styled softer
  // than the red error banner.
  const [hint, setHint] = useState("");
  const [wsStatus, setWsStatus] = useState("disconnected");

  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [assistantLive, setAssistantLive] = useState("");
  // On-screen "learning card": corrected sentence (shown only when it changed)
  // + a next-line hint (always shown). Arrives right before assistant.done.
  const [coaching, setCoaching] = useState<{
    original: string;
    corrected: string;
    hints: string[];
    changed: boolean;
  } | null>(null);
  const [history, setHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);

  useEffect(() => {
    isThinkingRef.current = isThinking;
  }, [isThinking]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

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
    if (!canListen || isThinkingRef.current) return;
    setError("");
    setCanRetry(false);
    setHint("");
    setTranscript("");
    setFinalTranscript("");
    setAssistantLive("");
    setCoaching(null);
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
              level: levelRef.current,
              history: historyRef.current.slice(-10),
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
        autoSendRef.current.armed &&
        !autoSendRef.current.sent &&
        !isThinkingRef.current;
      const text = (autoSendRef.current.lastText || "").trim();
      if (shouldAutoSend) {
        if (!isMeaningfulUtterance(text)) {
          // Nothing usable was captured — nudge instead of sending noise.
          setHint("I didn't catch that. Tap the mic and try again.");
          return;
        }
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
    ws.onclose = () => {
      setWsStatus("disconnected");
      // Drop the reference so the next send opens a fresh socket instead of
      // reusing a closed/half-open one.
      if (wsRef.current === ws) wsRef.current = null;
    };
    ws.onerror = () => setWsStatus("error");

    return ws;
  };

  const sendText = async (text: string) => {
    const message = text.trim();
    if (!message || isThinkingRef.current) return;
    isThinkingRef.current = true;
    lastMessageRef.current = message;
    setIsThinking(true);
    setError("");
    setCanRetry(false);
    setHint("");
    setAssistantLive("");
    setCoaching(null);

    let settled = false;
    let responseTimer: ReturnType<typeof setTimeout> | null = null;
    let activeWs: WebSocket | null = null;
    let handleMessage: ((event: MessageEvent) => void) | null = null;
    let handleClose: (() => void) | null = null;

    // Single place that tears everything down, so the message listener, the
    // close listener, and the timeout can never leak, no matter which path
    // ends the request.
    const finish = () => {
      if (settled) return;
      settled = true;
      if (responseTimer) clearTimeout(responseTimer);
      if (activeWs && handleMessage) {
        activeWs.removeEventListener("message", handleMessage);
      }
      if (activeWs && handleClose) {
        activeWs.removeEventListener("close", handleClose);
      }
      isThinkingRef.current = false;
      setIsThinking(false);
    };

    // Any failure ends the turn AND offers a retry of the same message.
    const fail = (friendly: string) => {
      if (settled) return;
      setError(friendly);
      setCanRetry(true);
      finish();
    };

    try {
      const ws =
        wsRef.current && wsRef.current.readyState === WebSocket.OPEN
          ? wsRef.current
          : connectWs();
      activeWs = ws;

      const fullHistory = historyRef.current.slice(-10);
      let liveBuffer = "";
      let fullText = "";

      handleMessage = (event: MessageEvent) => {
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

          if (msg.type === "assistant.coaching") {
            setCoaching({
              original: msg.original ?? "",
              corrected: msg.corrected ?? "",
              hints: Array.isArray(msg.hints) ? msg.hints : [],
              changed: Boolean(msg.changed),
            });
          }

          if (msg.type === "assistant.done") {
            const merged = fullText.trim();
            if (merged) {
              setAssistantText(merged);
              setHistory((prev) => [
                ...prev,
                { role: "user", content: message },
                { role: "assistant", content: merged },
              ]);
            }
            finish();
          }

          if (msg.type === "server.error") {
            fail(friendlyError(msg.code, msg.message));
          }
        } catch {
          // ignore malformed frames
        }
      };

      // If the socket drops mid-reply (network blip, backend restart), don't
      // hang until the 30s timeout — surface it right away with a retry.
      handleClose = () => {
        fail("Connection lost while the coach was replying. Please try again.");
      };

      ws.addEventListener("message", handleMessage);
      ws.addEventListener("close", handleClose);

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
          ws.addEventListener(
            "error",
            () => {
              clearTimeout(t);
              reject(new Error("WS error"));
            },
            { once: true },
          );
        });
      }

      // Safety net: if the backend never sends done/error, stop waiting instead
      // of leaving the UI stuck on "Thinking…".
      responseTimer = setTimeout(() => {
        fail("The coach took too long to respond. Please try again.");
      }, 30000);

      ws.send(
        JSON.stringify({
          type: "client.final",
          text: message,
          level: levelRef.current,
          history: fullHistory,
        }),
      );
    } catch {
      fail(
        "Could not reach the coach. Please check the backend is running and try again.",
      );
    }
  };

  const sendFromVoice = async () => {
    if (isThinkingRef.current) return;
    const message = (finalTranscript || transcript || "").trim();
    if (!isMeaningfulUtterance(message)) {
      setHint("I didn't catch that. Tap the mic and try again.");
      return;
    }
    autoSendRef.current.sent = true;
    await sendText(message);
  };

  const currentCaptured = (finalTranscript || transcript || "").trim();

  // One clear phase for the whole flow, so the learner always knows what's
  // happening: Listening → Thinking → Speaking → Ready.
  const isSpeaking = speech.state !== "idle";
  const phase = isListening
    ? "listening"
    : isThinking
      ? "thinking"
      : isSpeaking
        ? "speaking"
        : "ready";
  const phaseMeta = {
    ready: {
      label: "Ready",
      icon: Mic,
      className: "border-slate-200 bg-slate-50 text-slate-500",
      spin: false,
    },
    listening: {
      label: "Listening…",
      icon: Ear,
      className: "border-blue-200 bg-blue-50 text-blue-700",
      spin: false,
    },
    thinking: {
      label: "Thinking…",
      icon: Loader2,
      className: "border-amber-200 bg-amber-50 text-amber-700",
      spin: true,
    },
    speaking: {
      label: "Speaking…",
      icon: Volume2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      spin: false,
    },
  }[phase];
  const PhaseIcon = phaseMeta.icon;

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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          {canRetry && lastMessageRef.current ? (
            <button
              type="button"
              onClick={() => void sendText(lastMessageRef.current)}
              disabled={isThinking}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {hint && !error ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {hint}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${phaseMeta.className}`}
          >
            <PhaseIcon
              className={`h-3.5 w-3.5 ${phaseMeta.spin ? "animate-spin" : ""}`}
            />
            {phaseMeta.label}
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
            {isSpeaking ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={speech.stop}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </button>
                {speech.state === "paused" ? (
                  <button
                    type="button"
                    onClick={speech.resume}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={speech.pause}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </button>
                )}
              </div>
            ) : null}

            {coaching ? (
              <div className="mt-3 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                {coaching.changed ? (
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 line-through">
                      {coaching.original}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="font-medium text-emerald-700">
                      {coaching.corrected}
                    </span>
                  </p>
                ) : null}
                {coaching.hints.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">
                      💡 Try saying next:
                    </p>
                    {coaching.hints.map((h, i) => (
                      <p key={i} className="text-slate-600">
                        {i + 1}. {h}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
