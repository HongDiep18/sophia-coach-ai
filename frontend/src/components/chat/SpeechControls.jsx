import { Eye, EyeOff, Volume2 } from "lucide-react";

export default function SpeechControls({
  speechRate,
  onSpeechRateChange,
  showTranslation,
  onToggleTranslation,
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={onToggleTranslation}
        title={showTranslation ? "Hide Vietnamese" : "Show Vietnamese"}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        {showTranslation ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
        <Volume2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.25}
          value={speechRate}
          onChange={(e) => onSpeechRateChange(Number(e.target.value))}
          className="h-1 w-20 cursor-pointer accent-blue-600 sm:w-24"
          aria-label="Speech rate"
        />
        <span className="w-9 text-right font-mono text-xs text-slate-500">
          {speechRate}x
        </span>
      </div>
    </div>
  );
}
