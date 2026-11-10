# TASK_TRACKER

> Update this file at the start and end of every milestone. One milestone = one or more
> commits that leave the app working.

## Owner's request (2026-11-10)

1. Improve the visuals and animations of the existing games.
2. Add a platform game where higher platforms give a higher score.
3. Add a flappy-style game.
4. Improve the visuals of the whole app where possible, especially the themes.
5. All games in consistent pixel-art graphics, like Our Room.
6. Use Supabase as little as possible.

## Milestones

| # | Milestone | Status |
| --- | --- | --- |
| 0 | Assessment, project memory files, baseline checkpoint | ✅ done |
| 1 | Arcade engine + **Hop Up** (platformer) + route + entry in Game corner | ✅ done |
| 2 | **Wing It** (flap game) on the same engine | ✅ done |
| 3 | Pixel makeover of the 5 two-player games (shared pixel kit, motion, result screen) | ✅ done |
| 4 | Game corner hub redesign (pixel game cards, solo + two-player sections) | ✅ done |
| 5 | App-wide visual polish, theme (skin) audit and fixes | ✅ done |
| 6 | Final regression pass, docs, hand-over report | ✅ done |
| 7 | Daily-question archive: answered days never expire; merged to `main` | ✅ done |

## Current task

None in progress. The owner's requests of 2026-11-10 (games, pixel look, theme audit, and
daily-question answers that never expire) are done and merged into `main`.

## Recommended next milestones (in this order)

1. **Owner tries it on a real phone** (checklist in TESTING_GUIDE §6) and reports what feels
   off — especially the steering in Hop Up and the tap strength in Wing It.
2. **Fix the phone build** (`npm run build:spa`) — see "Blocked" below.
3. **Tune the arcade games** from that feedback (constants at the top of each `logic.ts`).
4. Optional ideas from the list below.

## Pending ideas (not started, need owner's OK where marked)

- Pixel icons for the remaining Lucide glyphs inside game areas (flag, pause, arrows, fork).
- Hop Up ideas: pick your mascot, moving hazards in the night zones, tilt-to-steer.
- Share arcade best scores with the partner (needs a database column or table → **ask owner**).
- Arcade games earning Love Points for Our Room (writes to `rooms` → **ask owner**).
- Clean the lint baseline with one formatting-only commit (large diff → **ask owner**).
- Break up the very large page files (`photos.tsx`, `games.index.tsx`).
- Update `README.md` (still the original brief, older Supabase project id).

## Blocked / needs the owner

- **Phone build is broken** (`npm run build:spa` fails; it already failed before this work).
  See DEVELOPMENT_LOG, milestone 5. Needs a decision on the admin server functions in the
  phone app. A follow-up task was suggested to the owner.
- Real-device checks listed in TESTING_GUIDE §6 (real accounts, touch feel, sound).

## Completed

- 2026-11-10 — Milestone 0 (Claude).
- 2026-11-10 — Milestone 1 (Claude): arcade engine, Hop Up, pixel zone styles, first tests.
- 2026-11-10 — Milestone 2 (Claude): Wing It; fixed the pixel font's fi/fl ligature bug.
- 2026-11-10 — Milestone 3 (Claude): pixel makeover of the 5 two-player games; two-tap give up;
  per-phone round wording; final-board recap.
- 2026-11-10 — Milestone 4 (Claude): Game corner redesign; pixel banner on the Our Room page.
- 2026-11-10 — Milestone 5 (Claude): theme audit; readable panel + accent text; Jelly tile fix;
  chat button position fix; keyboard focus ring.
- 2026-11-10 — Milestone 5b (Claude): Food Roulette + dice page in the pixel look; `/spicy`
  reload fix.
- 2026-11-10 — Milestone 6 (Claude): final regression pass, hand-over notes.
- 2026-11-10 — Milestone 7 (Claude): daily-question answers never expire; merged to `main`.
