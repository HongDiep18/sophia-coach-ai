import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Send, X } from "lucide-react";
import { postChatbotReply } from "../api";
import type { ChatHistoryItem } from "../api/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm the app help assistant. Ask me anything about using FluentFlow — " +
    "the Voice Assistant, Chat coach, Vocabulary Bank, or Settings.",
};

// Pool of hint questions. Three are shown at a time; tapping one sends it and
// rotates in fresh ones from the rest of the pool.
const QUESTION_POOL = [
  "How do I save a word to my vocabulary?",
  "Which browser do I need for the Voice Assistant?",
  "What's the difference between Chat and Voice?",
  "How do I change the coach's difficulty level?",
  "Can the app read replies out loud?",
  "How do I hide the Vietnamese translation?",
  "What do the vocabulary learning statuses mean?",
  "Do I need a microphone to use the app?",
  "Where are my saved words stored?",
];

const VISIBLE_COUNT = 3;

// Safety net: the model is told to reply in plain text, but if any Markdown
// slips through, strip the markers so bubbles never show literal ** or #.
// Line breaks are preserved and rendered via `whitespace-pre-wrap`.
function toPlainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold**
    .replace(/__(.+?)__/g, "$1") // __bold__
    .replace(/`([^`]+)`/g, "$1") // `code`
    .replace(/^#{1,6}\s+/gm, "") // # headings
    .replace(/^\s*[-*]\s+/gm, "• ") // - / * bullets → •
    .trim();
}

// Pull the next set of hints from the bank, recycling the full pool when the
// bank runs low so hints never run out.
function drawHints(bank: string[]): { picked: string[]; rest: string[] } {
  const source = bank.length >= VISIBLE_COUNT ? bank : QUESTION_POOL;
  return {
    picked: source.slice(0, VISIBLE_COUNT),
    rest: source.slice(VISIBLE_COUNT),
  };
}

export default function FloatingChatButton() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [hints, setHints] = useState<string[]>(() =>
    QUESTION_POOL.slice(0, VISIBLE_COUNT),
  );
  const [hintBank, setHintBank] = useState<string[]>(() =>
    QUESTION_POOL.slice(VISIBLE_COUNT),
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const sendMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Send prior turns (excluding the welcome note) so follow-ups have context.
      const history: ChatHistoryItem[] = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const reply = await postChatbotReply({ message: text, history });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply.answer,
          sources: reply.sources,
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Sorry, I couldn't reach the help service. Please make sure the " +
            "backend is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  // Tapping a hint asks it, then rotates the hint set: the tapped hint is
  // removed; once only one would remain, refill with a fresh set of three.
  const useHint = (question: string) => {
    if (loading) return;
    const remaining = hints.filter((h) => h !== question);
    if (remaining.length > 1) {
      setHints(remaining);
    } else {
      const { picked, rest } = drawHints(hintBank);
      setHints(picked);
      setHintBank(rest);
    }
    void sendMessage(question);
  };

  // Hints always show after a response; only hidden while the bot is thinking.
  const showSuggestions = !loading && hints.length > 0;

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="fixed bottom-24 right-6 z-40 flex h-[30rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-blue-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold leading-none">
                    App Help Assistant
                  </p>
                  <p className="mt-0.5 text-[10px] leading-none text-blue-100">
                    Answers about using the app
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close help chat"
                className="rounded-lg p-1 text-blue-100 transition hover:bg-blue-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-3"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-end gap-1.5 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
                      <Bot className="h-4 w-4" />
                    </span>
                  ) : null}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "rounded-br-sm bg-blue-600 text-white"
                        : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">
                      {message.role === "assistant"
                        ? toPlainText(message.content)
                        : message.content}
                    </p>
                    {message.sources && message.sources.length > 0 ? (
                      <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
                        Source: {message.sources.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex items-end justify-start gap-1.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking…
                  </div>
                </div>
              ) : null}

              {showSuggestions ? (
                <div className="mt-1 flex flex-col items-start gap-1.5">
                  <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Try asking
                  </p>
                  {hints.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => useHint(question)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask about the app…"
                className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                aria-label="Send"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="fixed bottom-6 right-6 z-40"
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close help chat" : "Open help chat"}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-700"
        >
          {!open ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/40" />
          ) : null}
          {open ? (
            <X className="relative h-6 w-6" />
          ) : (
            <Bot className="relative h-6 w-6" />
          )}
        </button>
      </motion.div>
    </>
  );
}
