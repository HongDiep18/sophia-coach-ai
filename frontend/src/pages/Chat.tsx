import { AnimatePresence } from "framer-motion";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { postChatReply } from "../api";
import { ApiError } from "../api/client";
import ChatInput from "../components/chat/ChatInput";
import MessageBubble from "../components/chat/MessageBubble";
import SpeechControls from "../components/chat/SpeechControls";
import WordLookupModal from "../components/chat/WordLookupModal";
import { useToast } from "../components/ui/toast";
import { useSpeechPlayback } from "../hooks/useSpeechPlayback";

// Gemini's rate-limits reference — surfaced as the toast action on quota errors.
const RATE_LIMIT_HELP_URL =
  "https://ai.google.dev/gemini-api/docs/rate-limits";

// The conversation is kept in the browser so it survives moving between
// pages (and a refresh). "New Chat" clears it — nothing is stored server-side.
const CHAT_STORAGE_KEY = "sophia-chat-messages";
// Whether the Vietnamese translation is shown. A preference, so it persists
// across pages/refresh and is NOT reset by "New Chat".
const TRANSLATION_STORAGE_KEY = "sophia-show-translation";
// Speech playback speed — also a persisted preference.
const SPEECH_RATE_STORAGE_KEY = "sophia-speech-rate";
const DEFAULT_SPEECH_RATE = 1;
// Settings screen preferences (see AppSettings). Read fresh when needed so the
// latest saved value is used without wiring up a storage listener.
const SETTINGS_STORAGE_KEY = "sophia-coach-settings";

function loadAutoSpeak(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.auto_speak === true;
  } catch {
    return false;
  }
}

function loadShowTranslation(): boolean {
  try {
    const raw = localStorage.getItem(TRANSLATION_STORAGE_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

function loadSpeechRate(): number {
  try {
    const raw = localStorage.getItem(SPEECH_RATE_STORAGE_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : DEFAULT_SPEECH_RATE;
  } catch {
    return DEFAULT_SPEECH_RATE;
  }
}

const createMessage = (role: string, content: string, extra: any = {}) => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
  ...extra,
});

const makeGreeting = () => [
  createMessage(
    "assistant",
    "Hi! I am your English speaking coach. Tell me about your current project.",
    {
      vietnamese:
        "Xin chào! Tôi là huấn luyện viên nói tiếng Anh của bạn. Hãy cho tôi biết về dự án hiện tại của bạn.",
    },
  ),
];

function loadInitialMessages(): any[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return makeGreeting();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : makeGreeting();
  } catch {
    return makeGreeting();
  }
}

function getLastAssistantEnglishText(messages: any[]) {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  return last?.english || last?.content || "";
}

export default function Chat() {
  const [isResponding, setIsResponding] = useState(false);
  const [showTranslation, setShowTranslation] = useState(loadShowTranslation);
  const [speechRate, setSpeechRate] = useState(loadSpeechRate);
  // Session id resets on "new chat"; the setter is what matters here.
  const [, setSessionId] = useState(() => crypto.randomUUID());
  const [wordModal, setWordModal] = useState({
    open: false,
    word: "",
    context: "",
  });
  const [messages, setMessages] = useState<any[]>(loadInitialMessages);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const speech = useSpeechPlayback();
  const toast = useToast();

  const handleWordClick = (cleanWord: string) => {
    setWordModal({
      open: true,
      word: cleanWord,
      context: getLastAssistantEnglishText(messages),
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isResponding]);

  // Persist the conversation so it survives navigating away and refresh.
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors (e.g. quota / private mode).
    }
  }, [messages]);

  // Remember the translation toggle across pages/refresh.
  useEffect(() => {
    try {
      localStorage.setItem(TRANSLATION_STORAGE_KEY, String(showTranslation));
    } catch {
      // Ignore storage errors.
    }
  }, [showTranslation]);

  // Remember the speech-speed setting across pages/refresh.
  useEffect(() => {
    try {
      localStorage.setItem(SPEECH_RATE_STORAGE_KEY, String(speechRate));
    } catch {
      // Ignore storage errors.
    }
  }, [speechRate]);

  const startNewChat = () => {
    setSessionId(crypto.randomUUID());
    // Wipe the saved conversation — a new chat starts clean and is not kept.
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
    setMessages([
      createMessage(
        "assistant",
        "New chat started. What do you want to practice?",
      ),
    ]);
    setIsResponding(false);
    setWordModal((prev) => ({ ...prev, open: false }));
    speech.stop();
  };

  const sendMessage = async (value: string) => {
    const text = value.trim();
    if (!text || isResponding) return;

    const userMessage = createMessage("user", text);
    setIsResponding(true);
    setMessages((prev) => [...prev, userMessage]);

    try {
      const history = messages.slice(-12).map((msg) => ({
        role: msg.role,
        content: msg.english || msg.content || "",
      }));

      const reply = await postChatReply({
        message: text,
        level: "B1",
        history,
      });

      setMessages((prev) => {
        // Attach the coach's corrected version to the message the learner
        // just sent, then append the coach's reply.
        const withCorrection = prev.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, corrected: reply.corrected }
            : msg,
        );
        return [
          ...withCorrection,
          createMessage("assistant", reply.english, {
            vietnamese: reply.vietnamese,
            analysis: reply.analysis,
            suggestions: reply.suggestions,
          }),
        ];
      });

      // Read the coach's reply aloud automatically when the learner has
      // enabled "Auto-speak AI responses" in Settings.
      if (reply.english && loadAutoSpeak()) {
        speech.speak(reply.english, speechRate);
      }
    } catch (error) {
      console.error(error);

      const quotaHit =
        error instanceof ApiError &&
        (error.status === 429 || error.code === "QUOTA_EXHAUSTED");

      if (quotaHit) {
        // Not a backend outage — the Gemini free tier's daily cap was reached.
        toast.warning("Daily AI limit reached", {
          description:
            "The Gemini free tier allows a limited number of requests per day. Try again later.",
          duration: 8000,
          action: {
            label: "Learn more",
            onClick: () => window.open(RATE_LIMIT_HELP_URL, "_blank"),
          },
        });
        setMessages((prev) => [
          ...prev,
          createMessage(
            "assistant",
            "I've hit today's AI usage limit (Gemini free tier). This isn't a backend problem — please try again later.",
            {
              vietnamese:
                "Da het luot AI trong ngay (Gemini free tier). Khong phai loi backend — hay thu lai sau.",
              analysis: "Gemini free-tier daily quota exhausted.",
              suggestions: ["Try again later", "Check your Gemini plan"],
            },
          ),
        ]);
      } else {
        toast.error("Could not reach the AI service", {
          description: "Please check the backend and try again.",
        });
        setMessages((prev) => [
          ...prev,
          createMessage(
            "assistant",
            "I could not reach the AI service. Please check backend and try again.",
            {
              vietnamese:
                "Khong the ket noi AI. Hay kiem tra backend va thu lai.",
              analysis: "Check backend env and server status.",
              suggestions: ["Try again", "Restart backend", "Check API key"],
            },
          ),
        ]);
      }
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <section className="mx-auto flex h-full w-full max-w-5xl flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          English Coach Chat
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <SpeechControls
            speechRate={speechRate}
            onSpeechRateChange={setSpeechRate}
            showTranslation={showTranslation}
            onToggleTranslation={() => setShowTranslation((v) => !v)}
            speechPlaybackState={speech.state}
            onStopSpeech={speech.stop}
            onPauseSpeech={speech.pause}
            onResumeSpeech={speech.resume}
          />
          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New Chat
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onWordClick={handleWordClick}
              onSpeak={speech.speak}
              onTipUse={sendMessage}
              tipsDisabled={isResponding}
              showTranslation={showTranslation}
              speechRate={speechRate}
            />
          ))}
        </AnimatePresence>
        {isResponding ? (
          <div className="text-sm text-slate-500">Coach is typing...</div>
        ) : null}
      </div>

      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
        <ChatInput onSend={sendMessage} isLoading={isResponding} />
      </div>

      <WordLookupModal
        word={wordModal.word}
        contextSentence={wordModal.context}
        open={wordModal.open}
        onOpenChange={(open) => setWordModal((prev) => ({ ...prev, open }))}
      />
    </section>
  );
}
