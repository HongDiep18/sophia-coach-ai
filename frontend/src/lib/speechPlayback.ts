export enum SpeechPlaybackState {
  Idle = "idle",
  Playing = "playing",
  Paused = "paused",
}

const listeners = new Set<(state: SpeechPlaybackState) => void>();

function notify(state: SpeechPlaybackState) {
  for (const l of listeners) l(state);
}

export function subscribeSpeechPlayback(
  listener: (state: SpeechPlaybackState) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSpeechPlaybackState(): SpeechPlaybackState {
  if (typeof window === "undefined" || !window.speechSynthesis)
    return SpeechPlaybackState.Idle;
  const syn = window.speechSynthesis;
  if (!syn.speaking && !syn.pending) return SpeechPlaybackState.Idle;
  if (syn.paused) return SpeechPlaybackState.Paused;
  return SpeechPlaybackState.Playing;
}

export function stopSpeechPlayback() {
  window.speechSynthesis?.cancel();
  notify(SpeechPlaybackState.Idle);
}

export function pauseSpeechPlayback() {
  const syn = window.speechSynthesis;
  if (!syn?.speaking || syn.paused) return;
  syn.pause();
  notify(SpeechPlaybackState.Paused);
}

export function resumeSpeechPlayback() {
  const syn = window.speechSynthesis;
  if (!syn?.paused) return;
  syn.resume();
  notify(SpeechPlaybackState.Playing);
}

export function speakTextWithOptions(options: {
  text: string;
  rate?: number;
  lang?: string;
}) {
  const { text, rate = 0.75, lang = "en-US" } = options;
  if (!text?.trim() || typeof window === "undefined") return;

  const syn = window.speechSynthesis;
  syn.cancel();

  const u = new SpeechSynthesisUtterance(text.trim());
  u.lang = lang;
  u.rate = rate;
  u.onstart = () => notify(SpeechPlaybackState.Playing);
  u.onend = () => notify(SpeechPlaybackState.Idle);
  u.onerror = () => notify(SpeechPlaybackState.Idle);
  syn.speak(u);
}
