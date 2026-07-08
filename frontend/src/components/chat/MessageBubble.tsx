import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { postWordGloss } from "../../api";

// Per-word Vietnamese meanings are cached across the whole conversation so a
// second hover on the same word (in the same sentence) is instant and free.
// Keyed by word + context because meaning is context-dependent.
const wordMeaningCache = new Map();
// In-flight gloss requests, keyed the same way, so two hovers on the same word
// (rapid re-hover, or the same word in two bubbles) share ONE network call
// instead of each spending tokens.
const inFlightGloss = new Map();
// How long the pointer must rest on a word before we fetch — keeps scanning
// across a sentence from firing a request per word.
const HOVER_DELAY_MS = 350;

// Resolve a word's short Vietnamese gloss: from cache if we have it, otherwise
// via a shared in-flight promise. Errors are NOT cached, so a later hover
// retries. Successful-but-empty replies fall back to a dash.
function fetchGloss(cacheKey, word, contextSentence) {
  if (wordMeaningCache.has(cacheKey)) {
    return Promise.resolve(wordMeaningCache.get(cacheKey));
  }
  const existing = inFlightGloss.get(cacheKey);
  if (existing) return existing;

  const request = postWordGloss({ word, contextSentence: contextSentence || "" })
    .then((res) => {
      const meaning = res.vietnamese?.trim() || "—";
      wordMeaningCache.set(cacheKey, meaning);
      return meaning;
    })
    .finally(() => inFlightGloss.delete(cacheKey));

  inFlightGloss.set(cacheKey, request);
  return request;
}

function ClickableWord({ word, onWordClick, contextSentence }) {
  const cleanWord = word.replace(/[.,!?;:'"()]/g, "");
  // tip: null = hidden; otherwise { loading, vietnamese }.
  const [tip, setTip] = useState(null);
  // Viewport coordinates of the word, so the portal tooltip can float above it.
  const [coords, setCoords] = useState(null);
  const timerRef = useRef(undefined);
  const btnRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  if (!cleanWord) return <span>{word} </span>;

  const cacheKey = `${cleanWord.toLowerCase()}|${contextSentence || ""}`;

  // Anchor point: top-center of the word, in viewport (fixed) coordinates.
  const anchorTooltip = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.top, left: rect.left + rect.width / 2 });
  };

  const handleEnter = () => {
    timerRef.current = window.setTimeout(async () => {
      anchorTooltip();
      const cached = wordMeaningCache.get(cacheKey);
      if (cached) {
        setTip({ loading: false, vietnamese: cached });
        return;
      }
      setTip({ loading: true, vietnamese: null });
      try {
        const meaning = await fetchGloss(cacheKey, cleanWord, contextSentence);
        // Only update if the pointer/focus is still on the word (not cleared).
        setTip((prev) => (prev ? { loading: false, vietnamese: meaning } : prev));
      } catch {
        setTip((prev) =>
          prev ? { loading: false, vietnamese: "Không dịch được." } : prev,
        );
      }
    }, HOVER_DELAY_MS);
  };

  const handleLeave = () => {
    window.clearTimeout(timerRef.current);
    setTip(null);
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => onWordClick?.(cleanWord, word)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className="rounded px-0.5 text-left transition hover:bg-blue-100 hover:text-blue-700"
      title={`Click to inspect "${cleanWord}"`}
    >
      {word}

      {/* Rendered into <body> with fixed coords so it floats ABOVE the chat
          frame and is never clipped by the scroll container's edge, while
          keeping the same on-screen position (centered just above the word). */}
      {tip &&
        coords &&
        createPortal(
          <AnimatePresence>
            <motion.span
              key="word-gloss"
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              style={{ top: coords.top, left: coords.left }}
              className="pointer-events-none fixed z-[80] flex w-max max-w-[14rem] -translate-x-1/2 -translate-y-[calc(100%+8px)] flex-col gap-0.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center shadow-xl ring-1 ring-white/10"
            >
              <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                🇻🇳 {cleanWord}
              </span>
              <span className="text-xs font-medium leading-snug text-white">
                {tip.loading ? "Đang dịch…" : tip.vietnamese}
              </span>
              <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900" />
            </motion.span>
          </AnimatePresence>,
          document.body,
        )}
    </button>
  );
}

export default function MessageBubble({
  message,
  onWordClick,
  onSpeak,
  onTipUse,
  tipsDisabled,
  showTranslation,
  speechRate,
}) {
  const [expanded, setExpanded] = useState(false);
  const isUser = message.role === "user";

  // Show the coach's rewrite only when it actually differs from what the
  // learner typed. Capitalization and punctuation are ignored — a sentence
  // that is only "fixed" by adding a capital or a "?" is treated as correct.
  const normalize = (text) =>
    (text || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim()
      .replace(/\s+/g, " ");
  const hasCorrection =
    isUser &&
    message.corrected &&
    normalize(message.corrected) !== normalize(message.content);

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

          {hasCorrection && (
            <div className="border-t border-blue-200 pt-2">
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">
                    Better way to say it
                  </p>
                  <div className="flex items-start gap-1.5">
                    <p className="text-xs leading-relaxed text-emerald-800">
                      {message.corrected}
                    </p>
                    <button
                      type="button"
                      onClick={() => speakText(message.corrected)}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded text-emerald-600 transition hover:bg-emerald-100"
                      title="Listen to the corrected sentence"
                    >
                      <Volume2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                    contextSentence={message.english || message.content}
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
                      {message.suggestions.map((s) =>
                        onTipUse ? (
                          <button
                            key={s}
                            type="button"
                            disabled={tipsDisabled}
                            onClick={() => onTipUse(s)}
                            className="inline-flex max-w-full items-center rounded-full border border-slate-300 bg-white px-2 py-1 text-left text-xs text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:pointer-events-none disabled:opacity-50"
                          >
                            <BookOpen className="mr-1 h-2.5 w-2.5 shrink-0" />
                            <span className="min-w-0 break-words">{s}</span>
                          </button>
                        ) : (
                          <span
                            key={s}
                            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
                          >
                            <BookOpen className="mr-1 h-2.5 w-2.5" />
                            {s}
                          </span>
                        ),
                      )}
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
