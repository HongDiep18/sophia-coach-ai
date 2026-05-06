import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Volume2,
} from "lucide-react";

function ClickableWord({ word, onWordClick }) {
  const cleanWord = word.replace(/[.,!?;:'"()]/g, "");
  if (!cleanWord) return <span>{word} </span>;

  return (
    <button
      type="button"
      onClick={() => onWordClick?.(cleanWord, word)}
      className="rounded px-0.5 text-left transition hover:bg-blue-100 hover:text-blue-700"
      title={`Click to inspect "${cleanWord}"`}
    >
      {word}
    </button>
  );
}

export default function MessageBubble({
  message,
  onWordClick,
  onSpeak,
  showTranslation,
  speechRate,
}) {
  const [expanded, setExpanded] = useState(false);
  const isUser = message.role === "user";

  const speakText = (text) => {
    if (!onSpeak) return;
    onSpeak(text, speechRate);
  };

  const baseBubbleClass =
    "space-y-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div
          className={`${baseBubbleClass} max-w-[80%] rounded-br-sm border-blue-200 bg-blue-50 text-slate-900`}
        >
          <p>{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[85%] space-y-2">
        <div
          className={`${baseBubbleClass} rounded-bl-sm border-slate-200 bg-white`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm leading-relaxed flex-1 flex flex-wrap gap-x-1">
              {(message.english || message.content || "")
                .split(" ")
                .map((word, i) => (
                  <ClickableWord
                    key={`${word}-${i}`}
                    word={word}
                    onWordClick={onWordClick}
                  />
                ))}
            </p>
            <button
              type="button"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-blue-700"
              onClick={() => speakText(message.english || message.content)}
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {showTranslation && message.vietnamese && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-200 pt-2">
                  <p className="text-xs leading-relaxed text-slate-500">
                    🇻🇳 {message.vietnamese}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {(message.analysis || message.suggestions?.length > 0) && (
          <div className="space-y-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-900"
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {expanded ? "Hide tips" : "Show tips & suggestions"}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-2"
                >
                  {message.analysis && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <p className="text-xs leading-relaxed text-amber-800">
                        {message.analysis}
                      </p>
                    </div>
                  )}

                  {message.suggestions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {message.suggestions.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
                        >
                          <BookOpen className="h-2.5 w-2.5 mr-1" />
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
