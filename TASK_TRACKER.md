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
| 8 | Phone build (`npm run build:spa`) builds and runs again | ✅ done |
| 9 | Capacitor set up: Android project, one-command sync, icon, guide (`PHONE_APP.md`) | ✅ done |
| 10 | 18+ dice replaced by a pixel slot machine | ✅ done |
| 11 | Slot machine: tap what was chosen for a "Wild" | ✅ done |

## Current task

None in progress. The owner's requests of 2026-11-10 (games, pixel look, theme audit, and
daily-question answers that never expire) are done and merged into `main`.

## Recommended next milestones (in this order)

1. **Owner tries it on a real phone** (checklist in TESTING_GUIDE §6) and reports what feels
   off — especially the steering in Hop Up and the tap strength in Wing It.
2. **Build the APK and try it on a phone** — follow `PHONE_APP.md`; see "Blocked" below.
3. **Tune the arcade games** from that feedback (constants at the top of each `logic.ts`).
4. Optional ideas from the list below.

## Pending ideas (not started, need owner's OK where marked)

- A "Build APK" button on GitHub (a GitHub Actions workflow that compiles the APK in the cloud,
  so no Android Studio is needed) — **ask owner**; it would also prove the Android project
  compiles.
- Native notifications in the phone app (needs a Capacitor plugin) — **ask owner**.
- Pixel icons for the remaining Lucide glyphs inside game areas (flag, pause, arrows, fork).
- Hop Up ideas: pick your mascot, moving hazards in the night zones, tilt-to-steer.
- Share arcade best scores with the partner (needs a database column or table → **ask owner**).
- Arcade games earning Love Points for Our Room (writes to `rooms` → **ask owner**).
- Clean the lint baseline with one formatting-only commit (large diff → **ask owner**).
- Break up the very large page files (`photos.tsx`, `games.index.tsx`).
- Update `README.md` (still the original brief, older Supabase project id).

## Blocked / needs the owner

- **First real APK build.** The Android project could not be compiled in the agent's workspace
  (Google's download servers are blocked there). The owner builds it following `PHONE_APP.md`
  and reports any error from Android Studio.
- Real-device checks listed in TESTING_GUIDE §6 (real accounts, touch feel, sound, and in the
  phone app: Our Room pictures, permission prompts, back button).

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
- 2026-11-10 — Milestone 8 (Claude): phone build fixed (server-only modules swapped out for the
  phone build; app mounted on the whole document).
- 2026-11-11 — Milestone 9 (Claude): Capacitor set up (Android project, commands, icon, guide).
- 2026-11-11 — Milestone 10 (Claude): 18+ dice replaced by a pixel slot machine; merged to `main`.
- 2026-11-11 — Milestone 11 (Claude): wild picker on the slot machine; merged to `main`.
