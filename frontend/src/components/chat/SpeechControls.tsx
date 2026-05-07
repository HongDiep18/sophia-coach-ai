import { Eye, EyeOff, Pause, Play, Square, Volume2 } from "lucide-react";

export default function SpeechControls({
  speechRate,
  onSpeechRateChange,
  showTranslation,
  onToggleTranslation,
  speechPlaybackState,
  onStopSpeech,
  onPauseSpeech,
  onResumeSpeech,
}) {
  const showPlayback =
    speechPlaybackState === "playing" || speechPlaybackState === "paused";

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

      {showPlayback ? (
        <div className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-1.5 py-1">
          <button
            type="button"
            onClick={onStopSpeech}
            title="Stop speech"
            aria-label="Stop speech"
            className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-red-600"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
          {speechPlaybackState === "playing" ? (
            <button
              type="button"
              onClick={onPauseSpeech}
              title="Pause speech"
              aria-label="Pause speech"
              className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-blue-700"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onResumeSpeech}
              title="Resume speech"
              aria-label="Resume speech"
              className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-blue-700"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : null}

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
