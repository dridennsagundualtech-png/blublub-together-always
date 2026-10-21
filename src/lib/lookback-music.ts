/**
 * A soft, made-in-the-app tune for the Look Back (no audio files, no copyright):
 * a warm pad, a gentle arpeggio and a little bell over F – C – Dm – B♭ at 76 bpm.
 * It plays live in the player and is rendered offline into the saved video.
 */

const BEAT = 60 / 76;
const BAR = BEAT * 4;
// Chords as MIDI notes: root, third, fifth (pad an octave lower, arpeggio around middle C).
const CHORDS = [
  [65, 69, 72], // F
  [60, 64, 67], // C
  [62, 65, 69], // Dm
  [58, 62, 65], // Bb
];
const ARP = [0, 1, 2, 1, 0, 2, 1, 2]; // eighth notes through the chord
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function note(
  ctx: BaseAudioContext,
  out: AudioNode,
  midi: number,
  at: number,
  len: number,
  {
    type = "sine",
    gain = 0.05,
    attack = 0.02,
  }: { type?: OscillatorType; gain?: number; attack?: number } = {},
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = hz(midi);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + len + 0.05);
}

/** Lowpass → master gain → speakers, fading in. */
function chain(ctx: BaseAudioContext) {
  const master = ctx.createGain();
  const soft = ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 2400;
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 1.5);
  soft.connect(master).connect(ctx.destination);
  return { master, soft };
}

/** Schedules every bar starting before `until` (seconds on the context clock); returns where the next bar starts. */
function scheduleBars(
  ctx: BaseAudioContext,
  out: AudioNode,
  state: { bar: number; at: number },
  until: number,
) {
  while (state.at < until) {
    const chord = CHORDS[state.bar % CHORDS.length]!;
    for (const n of chord)
      note(ctx, out, n - 12, state.at, BAR * 1.05, { gain: 0.035, attack: 0.6 });
    ARP.forEach((step, i) => {
      note(ctx, out, chord[step]!, state.at + (i * BEAT) / 2, BEAT * 0.9, {
        type: "triangle",
        gain: 0.045,
      });
    });
    note(ctx, out, chord[0]! + 12, state.at, BEAT * 2.5, { gain: 0.025, attack: 0.005 }); // bell
    state.bar += 1;
    state.at += BAR;
  }
}

/** Starts the tune; returns a function that fades it out and stops it. */
export function startLookBackMusic(): () => void {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const { master, soft } = chain(ctx);
  const state = { bar: 0, at: ctx.currentTime + 0.1 };
  // Schedule a little ahead so timers firing late never cause gaps.
  const schedule = () => scheduleBars(ctx, soft, state, ctx.currentTime + 0.8);
  schedule();
  const timer = window.setInterval(schedule, 200);
  if (ctx.state === "suspended") void ctx.resume();

  return () => {
    window.clearInterval(timer);
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    window.setTimeout(() => void ctx.close(), 1000);
  };
}

/** The tune as audio for a video of `seconds`, fading out over the last 2.5 s. */
export async function renderLookBackMusic(
  seconds: number,
  sampleRate = 48_000,
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const { master, soft } = chain(ctx);
  scheduleBars(ctx, soft, { bar: 0, at: 0.1 }, seconds);
  const fadeAt = Math.max(1.6, seconds - 2.5);
  master.gain.setValueAtTime(0.9, fadeAt);
  master.gain.exponentialRampToValueAtTime(0.0001, seconds);
  const audio = await ctx.startRendering();
  // Live it's background music; in a shared video it should be as loud as other videos (peak −2 dB).
  let peak = 0;
  for (let c = 0; c < audio.numberOfChannels; c++) {
    for (const v of audio.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
  }
  if (peak > 0) {
    const gain = 0.8 / peak;
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const data = audio.getChannelData(c);
      for (let i = 0; i < data.length; i++) data[i] = data[i]! * gain;
    }
  }
  return audio;
}
