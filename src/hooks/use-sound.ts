import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "blublub:sound-enabled";

export type Chirp = "tap" | "success" | "pop";

const RECIPES: Record<Chirp, { freq: number[]; dur: number }> = {
  tap: { freq: [660, 990], dur: 0.09 },
  success: { freq: [523, 784, 1046], dur: 0.14 },
  pop: { freq: [880], dur: 0.07 },
};

let ctx: AudioContext | null = null;

function isEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "false";
}

/** Plays a short synthesized chirp. Respects the user's sound setting. */
export function playChirp(kind: Chirp = "tap") {
  if (typeof window === "undefined" || !isEnabled()) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const { freq, dur } = RECIPES[kind];
    freq.forEach((f, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const start = ctx!.currentTime + i * dur * 0.6;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  } catch {
    /* audio unavailable — stay silent */
  }
}

/** Read/write the global sound-effects preference. */
export function useSoundSetting() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isEnabled());
  }, []);

  const toggle = useCallback((next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, String(next));
    setEnabled(next);
    if (next) playChirp("success");
  }, []);

  return { enabled, setEnabled: toggle };
}
