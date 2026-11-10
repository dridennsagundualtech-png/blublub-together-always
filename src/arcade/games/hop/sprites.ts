import { INK } from "@/arcade/art";
import type { SpriteDef } from "@/arcade/engine/types";

const SLAB = [
  "...oooooooooooooooooooooooo...",
  ".oowwwwwwwwwwwwwwwwwwwwwwwwoo.",
  "owwwwwwwwwwwwwwwwwwwwwwwwwwwwo",
  "owwwwwwwwwwwwwwwwwwwwwwwwwwwwo",
  "osswwwwwwwwsswwwwwwsswwwwwwsso",
  ".ossssswwsssssswwsssssswwssso.",
  "..oosssoossssssoossssssoosso..",
  "....ooo..oooooo..oooooo..oo...",
] as const;

/** The ordinary platform: a fluffy white cloud. */
export const PLATFORM_CLOUD: SpriteDef = {
  palette: { o: INK, w: "#FFFFFF", s: "#CFE0F7" },
  rows: SLAB,
};

/** A drifting platform: the same cloud in pink, so it reads as "this one moves". */
export const PLATFORM_DRIFT: SpriteDef = {
  palette: { o: INK, w: "#FFE3EE", s: "#FFAFCC" },
  rows: SLAB,
};

/** A biscuit: holds one jump, then crumbles. */
export const PLATFORM_BISCUIT: SpriteDef = {
  palette: { o: INK, b: "#F6D7A8", d: "#C99A5E", t: "#DDB078" },
  rows: [
    ".oooooooooooooooooooooooooooo.",
    "obbbbbbbbbbbbbbbbbbbbbbbbbbbbo",
    "obbdbbbbbbbdbbbbbbbbdbbbbbbdbo",
    "obbbbbbbbbbbbbbbbbbbbbbbbbbbbo",
    "otttttttttttttttttttttttttttto",
    ".oooooooooooooooooooooooooooo.",
  ],
};

const SPRING_PALETTE = { o: INK, p: "#FF8FB3", h: "#FFD3E1", c: "#B8A4E3" };

/** A bouncy pad standing tall… */
export const SPRING_UP: SpriteDef = {
  palette: SPRING_PALETTE,
  rows: [
    ".oooooooooo.",
    "oppppppppppo",
    "ohhppppppppo",
    ".oooooooooo.",
    "...occcco...",
    "..occcccco..",
    "...occcco...",
  ],
};

/** …and squashed, for the moment the cat lands on it. */
export const SPRING_DOWN: SpriteDef = {
  palette: SPRING_PALETTE,
  rows: [".oooooooooo.", "oppppppppppo", "ohhppppppppo", ".oooooooooo.", "..occcccco.."],
};
