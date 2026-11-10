import type { ArcadeInput } from "@/arcade/engine/types";

const LEFT_KEYS = new Set(["ArrowLeft", "a", "A"]);
const RIGHT_KEYS = new Set(["ArrowRight", "d", "D"]);
const ACTION_KEYS = new Set([" ", "Spacebar", "ArrowUp", "w", "W", "Enter"]);

export type InputSource = {
  /** The input for the next tick. Reading it uses up the one-tick `action` pulse. */
  read(): ArcadeInput;
  /** Forget anything held (used when the game pauses or loses focus). */
  reset(): void;
  dispose(): void;
};

/**
 * Touch, mouse and keyboard, folded into one small input shape.
 *  - Touch / mouse: pressing anywhere is the action; holding the left or right half steers.
 *  - Keyboard: arrow keys or A/D steer; Space, Up, W or Enter is the action.
 * `onAction` fires straight away on every press, even when no game tick is running, so menus
 * ("tap to start") can use the same gesture.
 */
export function attachInput(el: HTMLElement, onAction?: () => void): InputSource {
  const pointers = new Map<number, number>(); // pointer id -> -1 (left half) | 1 (right half)
  const keys = new Set<string>();
  let pulse = false;

  const sideOf = (e: PointerEvent) => {
    const box = el.getBoundingClientRect();
    return e.clientX < box.left + box.width / 2 ? -1 : 1;
  };

  const down = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Menu buttons drawn over the screen handle their own taps.
    if ((e.target as Element | null)?.closest?.("button, a")) return;
    e.preventDefault();
    pointers.set(e.pointerId, sideOf(e));
    pulse = true;
    onAction?.();
  };
  const move = (e: PointerEvent) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, sideOf(e));
  };
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
  };

  const keyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    const steer = LEFT_KEYS.has(e.key) || RIGHT_KEYS.has(e.key);
    const action = ACTION_KEYS.has(e.key);
    if (!steer && !action) return;
    // A focused button handles Space/Enter itself (pause, play again…) — don't double up.
    if (action && target && target.tagName === "BUTTON") return;
    e.preventDefault(); // keep Space / arrows from scrolling the page mid-game
    if (e.repeat) return;
    keys.add(e.key);
    if (action) {
      pulse = true;
      onAction?.();
    }
  };
  const keyUp = (e: KeyboardEvent) => {
    keys.delete(e.key);
  };
  const reset = () => {
    pointers.clear();
    keys.clear();
    pulse = false;
  };

  el.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", reset);

  return {
    read() {
      let left = false;
      let right = false;
      for (const side of pointers.values()) {
        if (side < 0) left = true;
        else right = true;
      }
      for (const key of keys) {
        if (LEFT_KEYS.has(key)) left = true;
        if (RIGHT_KEYS.has(key)) right = true;
      }
      const action = pulse;
      pulse = false;
      return { left, right, action };
    },
    reset,
    dispose() {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", reset);
    },
  };
}
