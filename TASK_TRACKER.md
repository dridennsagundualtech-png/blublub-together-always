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
| 1 | Arcade engine + **Hop Up** (platformer) + route + entry in Game corner | ⏳ next |
| 2 | **Wing It** (flap game) on the same engine | ⬜ pending |
| 3 | Pixel makeover of the 5 two-player games (shared pixel kit, motion, result screen) | ⬜ pending |
| 4 | Game corner hub redesign (pixel game cards, solo + two-player sections) | ⬜ pending |
| 5 | App-wide visual polish, theme (skin) audit and fixes | ⬜ pending |
| 6 | Final regression pass, docs, hand-over report | ⬜ pending |

## Current task

Milestone 1 — see DEVELOPMENT_LOG.md for the plan and decisions.

## Pending ideas (not started, need owner's OK where marked)

- Share arcade best scores with the partner (needs a database column or table → **ask owner**).
- Arcade games earning Love Points for Our Room (writes to `rooms` → **ask owner**).
- Clean the lint baseline with one formatting-only commit (large diff → **ask owner**).
- Break up the very large page files (`photos.tsx`, `games.index.tsx`).
- Update `README.md` (still the original brief, older Supabase project id).

## Blocked

- Nothing blocked. Limits of the sandbox (no real Supabase, no Lovable-hosted images) are
  worked around with a mock; see TESTING_GUIDE.md. Real-device checks are listed there for the
  owner.

## Completed

- 2026-11-10 — Milestone 0 (Claude).
