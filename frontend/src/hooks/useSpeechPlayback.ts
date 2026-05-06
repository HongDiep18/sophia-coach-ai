import { useEffect, useState } from "react";
import {
  enqueueSpeech,
  getSpeechPlaybackState,
  pauseSpeechPlayback,
  resumeSpeechPlayback,
  speakTextWithOptions,
  stopSpeechPlayback,
  subscribeSpeechPlayback,
  SpeechPlaybackState,
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
    enqueue: (text: string, rate?: number, lang?: string) =>
      enqueueSpeech({ text, rate, lang }),
    stop: stopSpeechPlayback,
    pause: pauseSpeechPlayback,
    resume: resumeSpeechPlayback,
  };
}

