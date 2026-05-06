import { useEffect, useState } from "react";
import {
  getSpeechPlaybackState,
  pauseSpeechPlayback,
  resumeSpeechPlayback,
  speakTextWithOptions,
  stopSpeechPlayback,
  subscribeSpeechPlayback,
  type SpeechPlaybackState,
} from "../lib/speechPlayback";

export function useSpeechPlayback() {
  const [state, setState] = useState<SpeechPlaybackState>(() =>
    getSpeechPlaybackState(),
  );

  useEffect(() => subscribeSpeechPlayback(setState), []);

  return {
    state,
    speak: (text: string, rate?: number, lang?: string) =>
      speakTextWithOptions({ text, rate, lang }),
    stop: stopSpeechPlayback,
    pause: pauseSpeechPlayback,
    resume: resumeSpeechPlayback,
  };
}
