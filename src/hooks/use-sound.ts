import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "blublub:sound-enabled";

export type Chirp = "tap" | "success" | "pop" | "tick" | "win";

const RECIPES: Record<
  Chirp,
  { freq: number[]; dur: number; type?: OscillatorType; gain?: number }
> = {
  tap: { freq: [660, 990], dur: 0.09 },
  success: { freq: [523, 784, 1046], dur: 0.14 },
  pop: { freq: [880], dur: 0.07 },
  // Roulette: a short wooden click per slice, and a little fanfare when it lands.
  tick: { freq: [1500], dur: 0.03, type: "triangle", gain: 0.07 },
  win: { freq: [659, 784, 988, 1319], dur: 0.16, type: "triangle", gain: 0.1 },
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
    const { freq, dur, type = "sine", gain: peak = 0.12 } = RECIPES[kind];
    freq.forEach((f, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = type;
      // Ticks wobble a touch in pitch so a fast spin doesn't sound like a buzzer.
      osc.frequency.value = kind === "tick" ? f * (0.94 + Math.random() * 0.12) : f;
      const start = ctx!.currentTime + i * dur * 0.6;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.004);
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
