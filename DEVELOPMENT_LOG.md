# DEVELOPMENT_LOG

> Newest entry first. One entry per milestone: what changed, why, what was learned.
> Keep entries factual — "verified" only means it was actually run and seen working.

---

## 2026-11-10 — Milestone 0: assessment + project memory (Claude)

**What was done**

- Read the whole project structure, the game code, the room code and the theme system.
- Installed dependencies locally and recorded a baseline (see below).
- Created the five memory files: `PROJECT_CONTEXT.md`, `FEATURE_MAP.md`, `DEVELOPMENT_LOG.md`,
  `TASK_TRACKER.md`, `TESTING_GUIDE.md`. No app code changed in this milestone.

**Baseline before any change (commit `bea9ae3`)**

| Check | Result |
| --- | --- |
| `tsc --noEmit` | passes, 0 errors |
| `vite build` (server build) | passes |
| `eslint .` | 2,725 problems, of which 2,701 are formatting-only (prettier) in existing files; 3 real errors (`no-empty`, `prefer-const`, `no-explicit-any`) and 21 warnings, all pre-existing |
| App in a browser (local, mocked data) | Home, Our Room, Game corner, Tic-Tac-Toe start screen all render, no page errors |

**Assessment**

*Working well*
- Clear structure: one route file per page, one `lib/` file per feature, shared UI kit.
- A real theme system: colours and "skins" are separate layers driven by CSS variables.
- Five two-player games with a shared flow (`GameShell`) and realtime sync.
- Pixel mascot sprites already exist as data (`pixel-critters.ts`) — reusable for games.

*Needs improvement*
- The five games use plain app cards and Lucide line icons; outside the Pixel skin they show
  soft PNG mascots, so they do not match the pixel-art look of Our Room.
- Game motion is limited to a pop/drop/flip; no idle life, no turn feedback, no celebration
  beyond a small confetti burst.
- The Game corner list is a plain list; nothing shows what each game looks like.
- There are no single-player games.

*Unfinished / technical debt*
- No automated tests and no test framework.
- Large page files (`photos.tsx` 1,361 lines, `games.index.tsx` 962) are hard to change safely.
- The lint baseline is noisy (formatting), which hides real warnings.
- `README.md` describes the original brief and an older Supabase project id.

*What could break*
- Shared classes in `styles.css` / `skins.css` are used by every page: a careless edit shows
  up everywhere. Screenshot several pages in several skins after touching them.
- The saved `state` JSON of two-player games: changing its shape breaks games in progress.
- `bun.lock` (Lovable's package mirror) and the generated files listed in PROJECT_CONTEXT.

*Opportunities*
- A shared "pixel kit" for games gives one consistent look and makes future games cheap.
- A small canvas engine in its own folder allows arcade games without new dependencies.
- The phone build (`spa/index.html`) only loads 2 of the 10 fonts the skins use — skins may
  fall back to default fonts in the phone app. To be confirmed and fixed in the theme milestone.

**Decisions**

- *Game technology:* plain `<canvas>` with a small in-house engine instead of a game library
  (Phaser, Kaboom…). Why: the two games are simple; a library would add 300 KB–1 MB to the app
  and a new dependency in `bun.lock`; our own code gives exact control of the pixel look.
  Trade-off: we write the loop, input and collision ourselves (small, and unit-tested).
- *Scores:* best scores live in the phone's `localStorage`. Why: the owner asked to use
  Supabase as little as possible. Trade-off: scores are per device and are not shared with the
  partner; clearing browser data clears them.
- *Pixel look in every skin:* game areas are wrapped in a `.pixel-zone` so they are pixel art
  regardless of the chosen app style, like Our Room. Colours still follow the couple's theme.
- *Two-player games:* visual changes only. Rules, saved data and realtime sync are untouched.

**Environment notes for the next agent**

- `bun install` fails in a sandbox because `bun.lock` points 31 packages at Lovable's private
  mirror. Workaround without changing the repo is in `TESTING_GUIDE.md`.
- Supabase and Lovable's asset store are not reachable from the sandbox; the testing guide
  explains the in-browser mock used instead. Never point tests at the real project.
