/**
 * The contract between an arcade game and whatever hosts it (ArcadeCabinet).
 *
 * A game is three plain things: rules (create/step), a picture (render) and a little
 * metadata. Rules never touch the DOM, so they can be unit-tested and replayed.
 * Time moves in fixed ticks: the host calls step() exactly 60 times per second of play.
 */

/** What the player is doing during one tick. */
export type ArcadeInput = {
  /** Steering: holding the left / right side of the screen, or the arrow keys. */
  left: boolean;
  right: boolean;
  /** True only on the tick the action started (tap, click, Space). */
  action: boolean;
};

export const NO_INPUT: ArcadeInput = { left: false, right: false, action: false };

/** Sound cues a game can ask for. The host decides how (and whether) they are played. */
export type ArcadeSound =
  | "jump"
  | "spring"
  | "coin"
  | "point"
  | "flap"
  | "crack"
  | "hit"
  | "fall"
  /** Played by the host itself when a run beats the saved best. */
  | "best";

/** A sprite as text: one character per pixel, "." is see-through. */
export type SpriteDef = {
  rows: readonly string[];
  palette: Readonly<Record<string, string>>;
};

export type ArcadeStatus = {
  score: number;
  /** The run has ended and the closing animation is finished. */
  over: boolean;
};

export type ArcadeGame<S = unknown> = {
  /** Used in the URL and as the key for the saved best score. Never rename once shipped. */
  id: string;
  title: string;
  /** One short line for menus. */
  blurb: string;
  /** Two or three short "how to play" lines for the title screen. */
  howTo: readonly string[];
  /** What the score counts, e.g. "points". */
  unit: string;
  /** Logical screen size in game pixels; the host scales it up with hard pixel edges. */
  width: number;
  height: number;
  /** A fresh run. The same seed always builds the same world. */
  create(seed: number): S;
  /** Advance one tick (1/60 s). Mutates the state. */
  step(state: S, input: ArcadeInput): void;
  status(state: S): ArcadeStatus;
  /** Extra facts for the game-over screen, e.g. height reached. */
  stats?(state: S): { label: string; value: string }[];
  /**
   * A simple computer player. It drives the self-playing demo on the title screen, and the
   * tests use it to prove a run is always playable.
   */
  demo?(state: S): ArcadeInput;
  /** Returns and clears the sounds queued since the last call. */
  takeSounds(state: S): ArcadeSound[];
  /**
   * Paint the state. `frame` counts up even while idle, for menu animation. `hud` is false on
   * the title screen, where the score would sit under the game's name.
   */
  render(ctx: CanvasRenderingContext2D, state: S, frame: number, hud: boolean): void;
  /** Small animated picture for menus (same art as the game). */
  icon: readonly SpriteDef[];
};

/**
 * Lets differently-typed games sit in one list. Each game keeps its own state type inside;
 * the host only ever hands a game back the state that same game created.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyArcadeGame = ArcadeGame<any>;
