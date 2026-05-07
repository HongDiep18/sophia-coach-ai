import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageSquarePlus } from "lucide-react";
import ChatInput from "../components/chat/ChatInput";
import MessageBubble from "../components/chat/MessageBubble";
import SpeechControls from "../components/chat/SpeechControls";
import WordLookupModal from "../components/chat/WordLookupModal";
import { useSpeechPlayback } from "../hooks/useSpeechPlayback";
import { postChatReply } from "../api";

const INITIAL_SUGGESTIONS = [
  "Can we practice a mock interview?",
  "Explain this sentence with easier words.",
  "Help me answer like a software developer.",
];

const createMessage = (role: string, content: string, extra: any = {}) => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
  ...extra,
});

function getLastAssistantEnglishText(messages: any[]) {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  return last?.english || last?.content || "";
}

export default function Chat() {
  const [isResponding, setIsResponding] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.75);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [wordModal, setWordModal] = useState({
    open: false,
    word: "",
    context: "",
  });
  const [messages, setMessages] = useState<any[]>([
    createMessage(
      "assistant",
      "Hi! I am your English speaking coach. Tell me about your current project.",
      {
        vietnamese:
          "Xin chào! Tôi là huấn luyện viên nói tiếng Anh của bạn. Hãy cho tôi biết về dự án hiện tại của bạn.",
      },
    ),
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const speech = useSpeechPlayback();

  const handleWordClick = (cleanWord: string) => {
    setWordModal({
      open: true,
      word: cleanWord,
      context: getLastAssistantEnglishText(messages),
    });
  };

  const suggestions = useMemo(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    return lastAssistant?.suggestions ?? INITIAL_SUGGESTIONS;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isResponding]);

  const startNewChat = () => {
    setSessionId(crypto.randomUUID());
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

      setMessages((prev) => [
        ...prev,
        createMessage("assistant", reply.english, {
          vietnamese: reply.vietnamese,
          analysis: reply.analysis,
          suggestions: reply.suggestions,
        }),
      ]);
    } catch (error) {
      console.error(error);
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

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => sendMessage(suggestion)}
            disabled={isResponding}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
        <ChatInput
          onSend={sendMessage}
          isLoading={isResponding}
          suggestions={suggestions}
        />
      </div>

      <WordLookupModal
        word={wordModal.word}
        contextSentence={wordModal.context}
        open={wordModal.open}
        onOpenChange={(open) => setWordModal((prev) => ({ ...prev, open }))}
        conversationId={sessionId}
      />
    </section>
  );
}
