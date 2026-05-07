import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Send, Sparkles } from "lucide-react";

type ChatInputProps = {
  onSend: (text: string) => void;
  isLoading: boolean;
  suggestions?: string[];
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getSpeechRecognition = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const isSpeechRecognitionSupported = () => Boolean(getSpeechRecognition());

export default function ChatInput({
  onSend,
  isLoading,
  suggestions,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const sendText = (value: string) => {
    const normalized = value.trim();
    if (!normalized || isLoading) return;
    onSend(normalized);
    setText("");
  };

  const toggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setText(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="space-y-3">
      {suggestions?.length ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => sendText(suggestion)}
              disabled={isLoading}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="mr-1 inline h-3 w-3" />
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleVoice}
          className={`grid h-10 w-10 place-items-center rounded-full border transition ${
            isListening
              ? "border-rose-300 bg-rose-100 text-rose-700"
              : "border-slate-300 bg-white text-slate-600 hover:text-slate-900"
          }`}
        >
          {isListening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendText(text);
            }}
            placeholder={isListening ? "Listening..." : "Type or speak English..."}
            disabled={isLoading}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-12 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200 disabled:opacity-70"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => sendText(text)}
            disabled={!text.trim() || isLoading}
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
