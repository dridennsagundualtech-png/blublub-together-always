# DEVELOPMENT_LOG

> Newest entry first. One entry per milestone: what changed, why, what was learned.
> Keep entries factual — "verified" only means it was actually run and seen working.

---

## 2026-11-11 — Milestone 11: choosing for a "Wild" on the slot machine (Claude)

**Owner's request**: "whenever the wild pick appears, make a button where I can tap one of the
choices so I know which one is the wild."

**What was done** (`src/components/games/SlotMachine.tsx`, styles in `src/pixel.css`)

- An option counts as wild when its text starts with the word "Wild" (`isWild`). Each reel has
  exactly one today ("Wild — you pick" / "Wild — partner's choice").
- When a reel lands on its wild, that line of the result ticket shows every *other* option of
  the same reel as a button, under "Tap what you chose:" (or "…what your partner chose:" for
  the partner's-choice wild).
- Tapping one writes it on the ticket with a **WILD** tag in front, so it stays clear that
  this line was the wild and what was picked for it. A small "change" link reopens the buttons.
- The lamp under a reel keeps blinking while its wild is still waiting for a choice.
- The choice is cleared by the next spin. Nothing is saved anywhere — it lives on the screen
  only, like the rest of the result.
- The reel itself still shows "Wild…" on its result row; only the ticket carries the choice.

**Verified** — `SPICY=1 node scripts/visual/slot-machine.mjs`, now 31 checks, all pass in the
Classic and Cyberpunk styles. The test forces every reel onto its wild (it hands the machine
the random numbers for one spin), then checks: a picker per wild; each picker lists the 7 other
options of its own reel and never the wild itself; a tap writes the choice with the WILD tag
and closes only that picker; "change" reopens it and another choice can be made; lamps blink
only while waiting; a following spin without a wild shows no picker and no tag. The earlier 20
checks still pass. `tsc`, `bun test` (20), web build and phone build pass.

**Not verified**: on a real phone.

---

## 2026-11-11 — Milestone 10: the dice became a pixel slot machine (Claude)

**Owner's request**: "replace the dice with a pixel slot machine, because the design is quite
sad and annoying."

**What was done**

- New `src/components/games/SlotMachine.tsx` replaces `DiceRoller.tsx` on the 18+ page
  (`routes/_authenticated/spicy.tsx`). Same job as before — pick one option at random from each
  list — shown as a slot machine instead of three tumbling dice:
  - a cabinet in the couple's main colour with a lit "LUCKY SPIN" sign and chasing lamps
    (they speed up during a spin);
  - one reel per list; symbols run downwards and the reels stop one after another with a
    small bounce; the middle row is the result, glowing, with a pointer on each side;
  - a lamp under each reel that lights when that reel has locked in;
  - a lever to pull (or the big Spin button);
  - the result written out on a ticket, one line per reel, with a sparkle;
  - before the first spin the result row is covered with "?" so nothing reads as a result.
- The round timer was redrawn in the same look: large digits, a bar of blocks that go out one
  by one, the last five seconds blink, and it buzzes when time is up.
- The option lists themselves and the two modes are unchanged. Wording that said "dice" or
  "roll" now says "slots" / "spin" (page title, Game corner entry, buttons, hints).
- Premium and age checks are untouched.
- Removed: `DiceRoller.tsx` and its 103 lines of 3D-dice styles in `styles.css` (nothing else
  used them).
- With "reduce motion" on there is no spinning: the result simply appears.

**Files changed**: added `src/components/games/SlotMachine.tsx`,
`scripts/visual/slot-machine.mjs`; edited `src/pixel.css` (slot machine styles),
`src/routes/_authenticated/spicy.tsx`, `src/routes/_authenticated/games.arcade.tsx` (label),
`src/styles.css` (dice styles removed); deleted `src/components/games/DiceRoller.tsx`.

**Verified** — `SPICY=1 node scripts/visual/slot-machine.mjs`, 20 checks, all pass, in the
Classic and Cyberpunk styles:

| Check | Result |
| --- | --- |
| Result row covered before the first spin; no result shown yet | pass |
| Five spins (one by the lever): the text on each reel's middle row is exactly the text on the result ticket, and each symbol sits exactly on the row (within 1 px) | pass |
| Results vary between spins; button locked while spinning | pass |
| Timer: starts at 01:00, counts down, pause holds, preset and reset work | pass |
| Second mode has its own machine; reels and result agree | pass |
| "Reduce motion": result appears at once and matches | pass |
| No page errors; `tsc`, `bun test` (20), web build, phone build | pass |

**Not verified**: sounds and the vibration (no audio or motor in the sandbox); feel on a phone.

---

## 2026-11-11 — Milestone 9: Capacitor set up in the repository (Claude)

**Owner's request**: add the Capacitor setup so that turning the phone build into an Android
project is one command (new packages approved by the owner).

**What was done**

- Added `@capacitor/core`, `@capacitor/android` (dependencies) and `@capacitor/cli`
  (dev dependency), all pinned to 8.6.0. `bun.lock` only gained entries; the 31 entries that
  point at Lovable's package mirror are untouched (two shared helper packages, `semver` and
  `yallist`, were re-arranged by bun — same versions for the packages that already used them).
- `capacitor.config.ts` (app id `com.blublub.app`, name BLUBLUB, web folder `dist`) and the
  generated Android project in `android/` (53 files, about 300 KB; build outputs and the copied
  web files are git-ignored by Capacitor's own `.gitignore`).
- Commands in `package.json`: `phone:sync` (phone build + copy into the Android project),
  `phone:open` (open Android Studio), `phone:run` (build, install and start on a plugged-in
  phone).
- Android permissions for features the app already has: location (sharing, map), microphone
  (voice notes), vibration. Marked as not required hardware.
- App icon and start-up screen drawn from the app's own pixel cat instead of Capacitor's
  placeholder logo (`scripts/phone/make-android-art.py`).
- **Our Room pictures in the phone app**: the 720 picture addresses of the form
  `"/__l5e/assets-v1/…"` are relative to the web site, so inside a phone app they would point at
  nothing. The phone build now rewrites them to full addresses on the live web app
  (`WEB_APP_ORIGIN` in `vite.config.spa.ts`). The web build is not affected.
- `android` added to the lint and formatter ignore lists.
- New guide for the owner: `PHONE_APP.md`.

**Verified (actually run)**

| Check | Result |
| --- | --- |
| `npm run phone:sync` | builds and copies; the copy in `android/` is identical to `dist/` |
| `npx cap doctor` | "Android looking great!" |
| Phone-build smoke test (`spa-smoke.mjs`) | 15 / 15, including "Our Room pictures are requested from the live web site" |
| Hosted-picture addresses in the phone bundle | 0 relative, 720 on the live site |
| `tsc`, `bun test` (20), normal `vite build` | pass |
| `AndroidManifest.xml` | parses as valid XML with the expected permissions |

**NOT verified — could not be done in this workspace**

- **Compiling the APK.** Android's build tools download from Google's servers
  (`dl.google.com`), which this workspace is not allowed to reach, so Gradle was never run.
  The Android project is Capacitor's stock template plus permissions and artwork, but it has
  not been compiled here. The first real build happens on the owner's computer.
- Whether the live site actually serves the hosted pictures to a phone app (the host is not
  reachable from here either). The addresses are exactly what a browser on the live site
  requests, so it should — but it is unconfirmed.
- Everything on a real phone: permissions prompts, back button, splash screen, icon.

**Known limits of the phone app** (also in `PHONE_APP.md`): Member access is web-only; system
notifications do not appear (the Android WebView has no web Notification API; the code already
skips them safely); the APK is a debug build signed per computer.

---

## 2026-11-10 — Milestone 8: the phone build works again (Claude)

**Owner's request**: "please fix the phone app build".

`npm run build:spa` is the static build that Capacitor wraps into the phone app. It had two
separate problems; fixing the first one exposed the second.

**Problem 1 — it did not build.** `Missing "#tanstack-start-entry" specifier in
"@tanstack/start-server-core"`. The owner-only "Member access" page
(`routes/_authenticated/admin-users.tsx`) calls *server functions* (`lib/admin.functions.ts`),
which belong to the web app's server and use the secret admin key. A phone app has no server,
and the phone build was trying to bundle that server framework.

*Fix* — phone build only, in `vite.config.spa.ts`: two exact module swaps.

| The web app uses | The phone build gets instead | What it does there |
| --- | --- | --- |
| `@/lib/admin.functions` | `src/spa/admin.functions.ts` | Same three function names; each one answers "Member access is managed in the web app, not in the phone app." The page shows that as its message. |
| `@tanstack/react-start` | `src/spa/react-start.ts` | Only `useServerFn`, which hands the function straight back. |

Why not make the admin tools work on the phone: they need the secret admin key, and a key
packed into a phone app can be extracted by anyone who downloads it. Web-only is the safe
answer. Verified: none of `SERVICE_ROLE`, `service_role`, `supabaseAdmin`, `createServerFn`,
`requireSupabaseAuth` appear anywhere in the built phone bundle.

**Problem 2 — it built, but froze on start.** Nothing was drawn and the page stopped
responding about a second after loading. A debugger pause showed React stuck in an endless
loop (`getParentHydrationBoundary`). Cause: the app's outer frame (`RootShell` in
`routes/__root.tsx`) draws `<html>`, `<head>` and `<body>` itself, as the web version needs,
but the phone entry mounted the app inside a `<div id="root">` *within* that same body, so
React owned the body from inside the body.

*Fix* — `src/main.spa.tsx` now mounts on the whole document (`createRoot(document)`), which is
how the web version runs, and the unused mount box was removed from `spa/index.html`.

**The web app is untouched**: no file used by the normal build changed. `routes/__root.tsx`,
`admin-users.tsx` and `admin.functions.ts` are exactly as before; the web build still contains
its server functions.

**Files changed**: `vite.config.spa.ts`, `src/main.spa.tsx`, `spa/index.html`; added
`src/spa/admin.functions.ts`, `src/spa/react-start.ts`, `scripts/visual/spa-smoke.mjs`;
`scripts/visual/harness.mjs` (`ADMIN=1` makes the pretend user the owner).

**Verified (actually run)**

| Check | Result |
| --- | --- |
| `npm run build:spa` | builds (139 files, 7 MB) |
| The built app, served and opened in a phone-sized browser: `scripts/visual/spa-smoke.mjs` | 14 / 14 pass — home, Pixel style and its font requested, Play tab, Game corner, Hop Up starts and draws, Tic-Tac-Toe, Daily question, Nest, Member access note, no page errors |
| Secret/server code in the phone bundle | none found |
| `tsc`, `bun test` (20), normal `vite build` | pass; web build still has its server functions |
| Milestone 5's font fix for the phone build | now confirmed: the style fonts are requested |

**Not verified — needs a real phone / Capacitor**

- Wrapping `dist/` with Capacitor and running it on Android (there is no Capacitor config in
  this repository, so that step happens elsewhere).
- **Our Room art in the phone app.** Furniture, backgrounds and part of the feelings pack are
  addressed as `/__l5e/assets-v1/...`, i.e. relative to whichever site serves the app. On
  Lovable hosting that works. Inside a phone app the "site" is the app itself, so these
  pictures may not load. If they don't, the phone build needs those addresses pointed at the
  live site — a small change in `vite.config.spa.ts`, not done here because it cannot be
  tested from the sandbox.
- Opening the phone build at a deep address (e.g. reloading on `/games/arcade`) does not work,
  because it is built with relative file paths. That is by design for Capacitor, which always
  starts the app at its front page.

---

## 2026-11-10 — Milestone 7: daily-question answers never expire (Claude)

**Owner's request**: "I want no expiration on daily questions answered, I want to review it
whenever I want."

**What was wrong**: nothing was ever deleted. The Archive on the Daily question page simply
walked back a fixed 30 days (`ARCHIVE_DAYS = 30`) and showed only those days, so an answer
older than a month stopped being displayed. A second, slower limit was hiding behind it: the
database hands over at most 1,000 rows per request, so after roughly 500 days of both partners
answering, the oldest answers would have been cut off as well.

**What changed** (`src/routes/_authenticated/questions.tsx`, the `QuestionArchive` part only)

- **Answered** now lists every past day you answered, newest first, with no time limit. It
  shows 30 days at first and a "Show older answers (N more)" button; the end of the list says
  "answers are kept forever".
- The archive loads the whole history page by page instead of the first 1,000 rows.
- **Not answered** still covers the last 30 days for catching up, and additionally keeps any
  older day your partner answered and you did not — otherwise that answer could never be
  revealed. Their text stays hidden until you answer, as before.
- When answering late on a day your partner already answered, the question shown and saved is
  the one they answered (taken from their saved answer), not recomputed from today's question
  list, so the two answers always belong to the same question.

No database change: same table, same columns, read-only query plus the existing insert.

**Verified** (`scripts/visual/questions-archive.mjs`, 12 checks, all pass) with a pretend history
of 1,214 answers going back 1,000 days: 606 answered days listed; answers from 45 and 400 days
ago visible; the 1,000-day-old answer reachable; history fetched in two pages; a 60-day-old
day only the partner answered is still answerable, stays hidden until answered, saves against
the partner's question, and then appears under Answered. `tsc`, `bun test` (20), `vite build`
pass; lint error count of `questions.tsx` unchanged.

**Not verified**: against the real database (the test uses the in-memory stand-in).

**Published**: after this milestone the branch was merged into `main` at the owner's request
(fast-forward, no history rewritten).

---

## 2026-11-10 — Milestone 6: final regression pass and hand-over (Claude)

**Regression run on the final code** (two simulated phones, in-memory database)

| Scenario | Result |
| --- | --- |
| Tic-Tac-Toe, Connect Four, Memory, RPS, War: full game to a win | 5 / 5 pass |
| Tic-Tac-Toe draw; give up (two taps) | pass |
| Hop Up and Wing It: title demo, start, play, pause, resume, game over | pass, no page errors |
| Food Roulette spin; dice page with and without access | pass |
| Main pages in all 8 skins after the theme fixes | pass (screenshots reviewed) |
| `tsc --noEmit` · `bun test` (20) · `vite build` | pass |

**A console message you may see while testing (not a bug in this work)**

`TypeError: Cannot read properties of undefined (reading '_nonReactive')` from
`RouterCore.preloadRoute`. The app preloads the five tab pages 1.5 s after it opens
(`_authenticated/route.tsx`); if a test navigates away at that moment the router logs this and
carries on (the call is already wrapped in `.catch`). It appeared in 3 of ~14 runs right after
a dev-server restart and in 0 of 3 repeat runs. It existed before this work.

**State at hand-over**

- Branch `claude/hopeful-meitner-01bzra`, 8 commits on top of `main` (`bea9ae3`). Not merged:
  merging to `main` is what publishes to Lovable, and that is the owner's call.
- No database change, no new dependency, `bun.lock` untouched, no generated file edited
  (`routeTree.gen.ts` was regenerated by the router plugin for the one new route).

**What the next agent should know first**

1. Read `PROJECT_CONTEXT.md` → "Games — two kinds" and "How to make something pixel".
2. A new arcade game = a folder in `src/arcade/games/` (rules, drawing, sprites) + one line in
   `src/arcade/registry.ts` + a test file. Nothing else in the app changes.
3. A new two-player game = a component using `pixel-kit.tsx`, an entry in
   `components/games/registry.ts` and in `GAME_META` (`lib/games.ts`), a `Preview` case in
   `games.arcade.tsx`. It saves into the existing `games` table (`kind` + `state` JSON), so it
   needs no database change either.
4. Tuning the feel of the arcade games is changing constants at the top of each `logic.ts`;
   the tests will tell you if a change makes a game unfair or impossible.

---

## 2026-11-10 — Milestone 5b: Food Roulette and the dice in the pixel look (Claude)

**What was done**

- New, general tool: **any page built from the app's ordinary cards, buttons and inputs turns
  pixel when it sits in a `.pixel-zone`** ("Shared app pieces inside a pixel zone" in
  `src/pixel.css`). The zone squares the corners, draws the chunky outline and hard shadow, and
  switches off each skin's own decorations (ribbons, rivets, grass, frosted glass) inside it.
- `AppLayout` got an optional `pixel` prop (default off) that puts the page body in a pixel
  zone. `food.tsx` and `spicy.tsx` use it — two lines each instead of rewriting those pages.
- Food wheel: hard pixel edges and ink outlines between the slices.
- **Bug fix:** reloading `/spicy` (or opening it by link) always bounced to the games list,
  because the access check ran before the sign-in check had finished. It now waits for it.
  People without access are still sent away (verified).

**Files changed**: `src/pixel.css`, `src/components/AppLayout.tsx` (one optional prop),
`src/routes/_authenticated/food.tsx`, `src/routes/_authenticated/spicy.tsx`,
`scripts/visual/harness.mjs` (`SPICY=1` lets the pretend users open the dice page).

**Verified**: Food Roulette in Classic, Jelly and Glass (identical pixel look); a spin lands and
moves to stage 2; "Your own list" tab; dice page with access (`SPICY=1`) and the redirect
without access; `tsc`, `bun test`, `vite build`; lint counts of the three old files unchanged.

**Not verified**: the dice roll and round-timer animations were not exercised, only rendered.

---

## 2026-11-10 — Milestone 5: app-wide polish and theme audit (Claude)

**Method**: screenshots of Home, Nest, Care, Calendar, Appearance and the Game corner in all
8 skins (48 screens), plus 12 further pages in Classic. Every skin renders; nothing was broken
outright. The problems found were shared ones, so they were fixed once at the source rather
than page by page.

| # | Problem found | Cause | Fix |
| --- | --- | --- | --- |
| 1 | "Nest tools" / "Care tools" titles and subtitles nearly invisible (white on a pale gradient) in every skin | `.panel-dark` always used white text, but the theme paints the panel with the couple's light gradient | `applyColors()` now sets `--panel-foreground` (dark or white, whichever reads better on the gradient — `readableOn()` in `lib/theme.ts`); `.panel-dark` uses it; new helpers `panel-soft-text`, `panel-chip` replace hard-coded `text-white/70`, `bg-white/10`. Cyberpunk gets dark text on its neon panel. |
| 2 | Pink link / accent text and icons very faint on the pale page (about 1.6:1 contrast) | `text-primary` used the pastel fill colour as text colour | New `--primary-ink` (the same hue, deeper) used by `.text-primary` and `.chip`. Fills (`bg-primary`) keep the pure colour. Scrapbook keeps its own darker ink. |
| 3 | Jelly: big tile buttons (e.g. the style picker) squeezed into ovals, text clipped | Jelly gave every filled button `border-radius: 999px` | Radius is now `1.9rem` (same as Jelly cards): normal buttons are still pills, tall tiles stay rounded boxes. |
| 4 | Chat button 17 px off the right edge in the Pixel skin (2 px off elsewhere) | The page slide-in animation briefly overflows sideways; on phones that widens `window.innerWidth`, which the button read at that moment | The page container clips sideways overflow (`overflow-x-clip` in `_authenticated/route.tsx`), and `ChatHead` measures `documentElement.clientWidth`. Measured afterwards: identical position in Classic, Pixel and Jelly; width stays 390 during a tab change; sticky header and tab bar unaffected. |
| 5 | No visible keyboard focus | none defined | Global `:focus-visible` outline (keyboard only; taps and clicks don't show it). |
| 6 | Phone build's HTML shell loaded 2 of the 10 fonts the skins use | `spa/index.html` was never updated when skins were added | Font list copied from `routes/__root.tsx`. **Unverified** — see below. |

**Files changed**: `src/styles.css`, `src/skins.css`, `src/lib/theme.ts`,
`src/components/ChatHead.tsx`, `src/routes/_authenticated/{route,nest,wellbeing}.tsx`,
`spa/index.html`.

**Verified**: before/after screenshots in Classic, Cyberpunk, Jelly, Pixel, Glass, Scrapbook,
Steampunk, Nature; chat-button position measured; sideways overflow measured during a page
change; `tsc`, `bun test`, `vite build` pass; lint error counts of the touched old files are
unchanged.

**⚠ Known issue found (not caused by this work, not fixed)**

`npm run build:spa` — the static build wrapped by Capacitor for the phone app — **fails**:
`Missing "#tanstack-start-entry" specifier in "@tanstack/start-server-core"`. It fails the
same way on the original commit `bea9ae3`. Cause: client-reachable files import TanStack Start
server features (`admin-users.tsx` → `useServerFn`, `lib/admin.functions.ts` →
`createServerFn` + auth middleware), which a plain client build cannot bundle. Fixing it needs
a decision about what the admin server functions should do in an app with no server, so it
was reported to the owner as a suggested follow-up task instead of being changed here.
Consequence: fix 6 above could not be tested, and a new phone app cannot be built until this
is resolved. The web app (Lovable hosting, `npm run build`) is unaffected.

**Left alone on purpose**

- The look of each skin (shapes, materials, fonts) — they are distinct and working.
- Old formatting-only lint noise.

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
