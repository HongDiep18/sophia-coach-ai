import { useCallback, useEffect, useState } from "react";
import { BookmarkPlus, Loader2, Volume2, X } from "lucide-react";
import { lookupWordDefinition } from "../../lib/wordLookup";
import { appendVocabToStorage } from "../../lib/vocabBank";

export default function WordLookupModal({
  word,
  contextSentence,
  open,
  onOpenChange,
  conversationId,
}) {
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const runLookup = useCallback(async () => {
    if (!word?.trim()) return;
    setLoading(true);
    setDefinition(null);
    try {
      const result = await lookupWordDefinition(word, contextSentence || "");
      setDefinition(result);
    } finally {
      setLoading(false);
    }
  }, [word, contextSentence]);

  useEffect(() => {
    if (open && word) {
      setSaved(false);
      runLookup();
    }
  }, [open, word, runLookup]);

  const close = () => onOpenChange?.(false);

  const saveWord = async () => {
    if (!definition || !word) return;
    setSaving(true);
    try {
      appendVocabToStorage({
        word: word.trim(),
        meaning: definition.definition,
        vietnamese: definition.vietnamese,
        example: definition.example,
        context_sentence: contextSentence || definition.example || "",
        conversation_id: conversationId || "",
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const speakWord = () => {
    if (!word) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-lookup-title"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2 pr-8">
          <h2
            id="word-lookup-title"
            className="font-mono text-xl font-semibold text-blue-700"
          >
            {word}
          </h2>
          <button
            type="button"
            onClick={speakWord}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-700"
            title="Play pronunciation"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : definition ? (
          <div className="space-y-4 text-sm">
            {definition.part_of_speech ? (
              <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">
                {definition.part_of_speech}
              </span>
            ) : null}
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                Definition
              </p>
              <p className="leading-relaxed text-slate-800">
                {definition.definition}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                Tiếng Việt
              </p>
              <p className="leading-relaxed text-slate-700">
                {definition.vietnamese}
              </p>
            </div>
            {definition.example ? (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">
                  Example
                </p>
                <p className="italic leading-relaxed text-slate-600">
                  &ldquo;{definition.example}&rdquo;
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={saveWord}
            disabled={saving || saved || loading || !definition}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saved ? (
              "Saved ✓"
            ) : saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving
              </>
            ) : (
              <>
                <BookmarkPlus className="h-3.5 w-3.5" /> Save to Vocab
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
