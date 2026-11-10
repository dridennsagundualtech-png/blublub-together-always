# DEVELOPMENT_LOG

> Newest entry first. One entry per milestone: what changed, why, what was learned.
> Keep entries factual — "verified" only means it was actually run and seen working.

---

## 2026-11-10 — Milestone 4: Game corner redesign (Claude)

**What was done**

- `routes/_authenticated/games.arcade.tsx` rebuilt in the pixel look:
  - **Scoreboard** with both mascots; whoever leads cheers and hops.
  - **Play together**: a card per two-player game with a small still of the real board
    (built from the same `px-*` pieces, so previews can't drift from the games). A blinking
    "!" replaces the red dot when a game needs you; "IN PLAY" marks a game in progress.
  - **Solo arcade**: animated sprite cards with the best score.
  - **Also here** (Food Roulette, 18+ Dice) and **Game history** in the same frames; a history
    row shows the winner's mascot and names the partner instead of the word "partner".
- Our Room page: the plain "Game corner" row became a pixel banner with two mascots and
  "7 pixel games — play together or solo". Same position, same red-dot logic.

**Files changed**: `src/routes/_authenticated/games.arcade.tsx` (rewritten, same data hooks),
`src/routes/_authenticated/games.index.tsx` (one block replaced, one unused import removed),
`scripts/visual/play-two-player.mjs`.

**Verified**: hub with an empty history and with finished games (scoreboard, history rows);
banner on the Our Room page; `tsc`, `bun test`, `vite build` pass; lint error count of
`games.index.tsx` unchanged (45 before, 45 after — all old formatting).

**Note for the next agent**: Lucide line icons are still used for Food Roulette / 18+ Dice and
for small UI glyphs (arrows, flag, pause). Replacing them with pixel icons is listed in
TASK_TRACKER as an idea, not done.

---

## 2026-11-10 — Milestone 3: pixel makeover of the two-player games (Claude)

**What was done** (looks and motion only — rules, saved data and realtime are unchanged)

- New shared pieces in `components/games/pixel-kit.tsx`: `PixelStage`, `PixelBoard`, `Versus`
  (both players, score, whose turn — the mover's plate lights up and an arrow hops above it),
  `Pips`, `Burst` (sparkle of pixel squares), `Waiting`, `Caption`. Styles in `src/pixel.css`.
- Every game is now pixel art in every app style (pixel mascots, pixel frames, pixel font,
  stepped "sprite frame" animations):
  - **Tic-Tac-Toe** — tile board, pieces pop in, empty squares blink when it is your turn.
  - **Connect Four** — board with pixel-round holes, critter coins (blue = penguin, pink =
    seal) that fall and bounce, arrows that hop over the columns you can use.
  - **Memory Match** — patterned card backs with a pixel heart, stepped flip, a matched pair
    turns mint and sparkles; scores sit in the player bar.
  - **Rock Paper Scissors** — big throw tiles with idle bobbing critters, your pick shakes and
    locks in, score shown as pips, the last round replays as a clash with the winner cheering.
  - **War** — pixel playing cards, 13-pip round tracker, winning card lifts and sparkles.
- Start screen: the two mascots squaring up, game name, pixel input and button; Enter starts.
- Result screen: winner cheering / loser asleep, a **recap of how it ended** (final board for
  Tic-Tac-Toe and Connect Four, final score for the others — `components/games/Recap.tsx`),
  the task on a dashed "ticket".
- **Give up now takes two taps** (first tap shows "Give up?" for 3.5 s). One stray tap used to
  forfeit the game and the task.

**Bugs fixed on the way**

- RPS "X won the round" and War "X takes the round" were saved as text by whichever phone made
  the move, using "You" for itself — so the partner could read "You won" when they had lost.
  The text is now worked out on each phone from the saved picks/cards. The saved fields are
  still written exactly as before (no data shape change).
- Memory: the flip card was an inline `<span>`, which ignores width/height, so the card faces
  had no size. It is now `display: block`. (Not confirmed whether production showed this.)

**Files changed**

- Added: `src/components/games/pixel-kit.tsx`, `src/components/games/Recap.tsx`,
  `scripts/visual/play-two-player.mjs`.
- Edited: `src/components/games/{GameShell,TaskBar,TicTacToe,ConnectFour,Memory,Rps,War}.tsx`,
  `src/pixel.css`. `DiceRoller.tsx` and `registry.ts` were not touched.

**Verified (actually run)** — two simulated phones on a shared in-memory database

| Scenario | Result |
| --- | --- |
| Start disabled until a task is typed; task shown on both phones | pass |
| Tic-Tac-Toe: full game to a win; out-of-turn taps ignored | pass |
| Tic-Tac-Toe: full board, no line → draw | pass |
| Connect Four: vertical four wins; coins animate | pass |
| Memory: mismatch flips back and passes the turn; all 6 pairs found; winner by pairs | pass |
| RPS: best of 3 ends at 2 wins; per-phone wording correct | pass |
| War: 13 rounds, then winner by rounds won | pass |
| Give up: one tap does nothing final, second tap gives the partner the win | pass |
| Result card + recap on both phones; scoreboard and history on the hub | pass |
| Skins: classic, cyberpunk, scrapbook | readable, pixel look kept |
| `tsc`, `bun test` (20), `vite build`, eslint on changed files | pass |

A diff check confirmed that no line of the rules code (`play`, `drop`, `flip`, `pick`, `next`,
the state written to the database) changed apart from quote formatting.

**Not verified here**

- Real realtime between two real accounts (the mock refetches instead of receiving a push).
- A game that was already in progress before this update: the state shape is unchanged, so it
  should simply open in the new look.

---

## 2026-11-10 — Milestone 2: Wing It (Claude)

**What was done**

- Second arcade game **Wing It** (`src/arcade/games/wing/`): the penguin mascot, drawn from
  the side with a three-pose flapping wing, flies between ice pillars over an arctic sea.
  Tap = one flap. +1 per pillar passed, +3 per fish caught. Touching ice or the sea ends the
  run. The sky changes every 10 points (day → golden hour → dusk → polar night with northern
  lights). An original game in the "tap to flap" genre: own name, character, art and scenery.
- Registered in `arcade/registry.ts`, so it appears in the Game corner and at
  `/games/play/wing` with no other app change.
- **Bug fix found on the way:** the pixel font (Pixelify Sans) draws the "fi"/"fl" ligatures
  like a capital A — "fish" read "Ash", and in the existing Pixel skin "five games" read
  "Ave games". Ligatures are now off in the Pixel skin (`skins.css`) and in every pixel zone
  (`pixel.css`).

**Files changed**

- Added: `src/arcade/games/wing/{logic,render,sprites,index}.ts`, `tests/arcade/wing.test.ts`.
- Edited: `src/arcade/registry.ts` (one line), `src/pixel.css` + `src/skins.css` (ligatures).

**Verified (actually run)**

| Check | Result |
| --- | --- |
| `tsc --noEmit` | pass |
| `bun test` | 20 tests pass (11 Hop Up, 9 Wing It) |
| `vite build` | pass |
| `eslint` on all new files | clean |
| Browser: title demo, start, flap, pause/resume, crash into sea, game-over card | works, no page errors |
| Browser: night sky zone via the demo (50 s) | renders (aurora, moon, stars) |
| Pixel skin Game corner: "five games" text | now correct |

**Implemented but not fully tested**

- Sounds, and the feel of tapping on a real phone. Tuning constants are at the top of
  `games/wing/logic.ts` (`GRAVITY`, `FLAP_SPEED`, `SPACING`, `gapAt`, `speedAt`, `MAX_STEP`).

**Discoveries**

- Fairness is proven by a test: a demo player limited to human tapping speed (one flap per
  7 ticks at most) scores 150–200 in 90 s on 11 of 12 seeds. The first tuning (stronger flap,
  bigger height steps between gaps) made the same player die within a dozen pillars — one flap
  lifted the penguin almost half the smallest gap. A flap now lifts ~21 px; the gap never goes
  below 52 px; consecutive gaps differ by at most 46 px.
- A flap sets the upward speed rather than adding to it, so "fly along the bottom of the safe
  band and flap when you sink to it" is the stable way to play — the demo player does exactly
  that.

---

## 2026-11-10 — Milestone 1: arcade engine + Hop Up (Claude)

**What was done**

- New self-contained module `src/arcade/`: a small canvas engine (`engine/`: fixed 60-tick
  loop, text-authored pixel sprites, 3×5 bitmap font, seeded random numbers, touch/mouse/
  keyboard input), a host component (`ArcadeCabinet.tsx`: title, pause, game over, best score),
  device-only best scores (`scores.ts`) and a game list (`registry.ts`).
- First game **Hop Up** (`games/hop/`): the cat mascot bounces up cloud platforms. Every
  platform that is a new height record pays points, and platforms pay more per zone
  (+1 in the Meadow, +2 in Cotton Sky, +3 at Sunset…). Drifting clouds, one-jump biscuits,
  spring pads, hearts (+5), six sky zones from day to stars.
- Title screen plays a silent self-playing demo ("attract mode") behind the game's name.
- New page `/games/play/$game`; "Solo arcade" card added to the Game corner.
- New `src/pixel.css`: the shared **pixel zone** look (`.pixel-zone`, `px-frame`, `px-btn`,
  `px-chip`, stepped sprite animations) used by the arcade now and by the two-player games in
  milestone 3. Imported from `styles.css` after `skins.css`.
- Eight short arcade sound cues added to `use-sound.ts` (additive; the sound switch applies).
- Floating chat button hides only while a run is being played (class `chat-head` +
  `<html data-arcade-playing>`), so it cannot cover the game or swallow taps.
- First automated tests: `tests/arcade/hop.test.ts`, run with `bun test`.

**Files changed**

- Added: `src/arcade/**`, `src/pixel.css`, `src/routes/_authenticated/games.play.$game.tsx`,
  `tests/arcade/hop.test.ts`, `scripts/visual/arcade.mjs`, `scripts/visual/demo.mjs`.
- Edited (small, additive): `src/styles.css` (one import), `src/hooks/use-sound.ts` (new cues),
  `src/components/ChatHead.tsx` (one class name), `src/routes/_authenticated/games.arcade.tsx`
  (Solo arcade section), `src/routeTree.gen.ts` (regenerated by the router plugin).

**Verified (actually run)**

| Check | Result |
| --- | --- |
| `tsc --noEmit` | pass |
| `bun test` | 11 tests pass |
| `vite build` | pass |
| `eslint` on all new files | clean |
| Browser, classic skin: title demo → tap to start → steer → pause → resume → game over → best saved to localStorage | works, no page errors |
| Browser, cyberpunk + nature skins: cabinet, pause and game-over menus | readable, pixel look kept |
| Game corner, Home, Our Room pages still render | yes |

**Implemented but not fully tested**

- Sound cues (the sandbox has no audio output).
- Feel on a real touch screen: steering is "hold the left or right half". Tuning values
  (gravity, jump, speeds, gaps) are constants at the top of `games/hop/logic.ts`.
- Keyboard control was exercised only through the code path, not by hand.

**Discoveries**

- A test "demo player" (`hopDemo`) climbs ~6,000 px in 90 s on almost every seed, which proves
  generated worlds are always climbable. A test also checks every gap is below one jump.
- Skins restyle shared classes and `[class*="bg-primary"]` buttons; using only `px-*` classes
  inside `.pixel-zone` keeps game UI out of their reach. Press effects are generic
  (`button:active`), so `pixel.css` overrides them inside a zone.
- `mix()` must return `#rrggbb` (not `rgb()`), because sky colours are mixed twice.
- The remote had no write access at first (push refused with 403); the owner reconnected
  GitHub and pushes work now.
- Remote branches `design/step-1…4` (20 Oct) hold an older design direction that was never
  merged; `main` moved on afterwards. They were left untouched.

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
