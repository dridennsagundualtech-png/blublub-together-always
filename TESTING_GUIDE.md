# TESTING_GUIDE

> How to run, check and verify BLUBLUB. If you change how something is tested, update this.

## 1. Install

```bash
bun install
```

**In a sandbox where Lovable's package mirror is blocked** (error `ProxyConnectFailed` for
`europe-west4-npm.pkg.dev`), install from the public registry *without committing a lockfile
change*:

```bash
cp bun.lock /tmp/bun.lock.orig
sed -i 's#https://europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/#https://registry.npmjs.org/#g' bun.lock
bun install --frozen-lockfile
cp /tmp/bun.lock.orig bun.lock      # put the original back — `git status` must show it unchanged
```

## 2. Run the app

```bash
npx vite dev --port 5173 --host 127.0.0.1
```

Open http://127.0.0.1:5173. The app can be browsed signed out (pages render, data is empty).
The solo arcade games work signed out.

## 3. The checks to run before every commit

| Check | Command | Expected |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | no output, exit 0 |
| Game logic tests | `bun test` | all pass |
| Build | `npx vite build` | ends with "You can preview this build…" |
| Lint (changed files only) | `npx eslint <files you touched>` | no errors |

`npx eslint .` on the whole repo reports ~2,700 old formatting problems — that is the known
baseline (see DEVELOPMENT_LOG). Only make sure *your* files are clean.

The build and the dev server regenerate `src/routeTree.gen.ts` when routes are added. Commit it.

## 4. Browser checks with a pretend backend (no real Supabase)

`scripts/visual/harness.mjs` opens the local app in a phone-sized Chromium (390×844) and
answers every Supabase request from memory: a signed-in user "Den", partner "Angel", one
couple, and a working `games` table. **It never contacts the real project.**

It needs Playwright to be available in the environment (it is not a project dependency).

Screenshots:

```bash
# node scripts/visual/shot.mjs <output prefix> <skin or -> <signed in 0/1> <path> [more paths]
node scripts/visual/shot.mjs /tmp/shots/base - 1 / /games /games/arcade
node scripts/visual/shot.mjs /tmp/shots/pixel pixel 1 /games/arcade
FULL=1 node scripts/visual/shot.mjs /tmp/shots/full cyberpunk 1 /nest     # whole page
```

Skins: `classic pixel jelly glass scrapbook cyberpunk steampunk nature`.

Arcade games:

```bash
# plays a run (start, steer, pause, resume, game over) and screenshots each step
node scripts/visual/arcade.mjs /tmp/shots/hop hop            # add a skin name and 1 for signed in
# watches the self-playing title demo; screenshots the game screen at the given seconds
node scripts/visual/demo.mjs /tmp/shots/hopdemo hop 4,26,48
```

Two phones playing each other (shared pretend database): pass the same `makeDb()` object to
two `openPhone()` calls, one with `who: ME` and one with `who: PARTNER` (a ready-made script
is planned for milestone 3).

What the mock cannot show: Our Room furniture/backgrounds and the feelings pack (hosted by
Lovable), realtime pushes (the mock has no websocket — a page sees the partner's move after
its next refetch), photos, storage.

## 5. Regression scenarios

Run these after touching shared styles, games, or navigation.

### Navigation and shell
- [ ] Bottom tabs: Home, Cal, Care, Play, Nest all open; the pill slides to the active tab.
- [ ] Swiping left/right on a normal page changes tab; swiping on a game board or the arcade
      screen does **not**.
- [ ] Header mascot opens the side menu; chat head opens chat.

### Two-player games (each of Tic-Tac-Toe, RPS, Memory, Connect Four, War)
- [ ] Start card: "Lock in task & start" is disabled until a task is typed.
- [ ] After starting, both phones show the board and the locked task.
- [ ] Only the player whose turn it is can move (RPS and War: both act).
- [ ] A win ends the game on both phones and the result card shows the task and the winner.
- [ ] A full board with no winner ends as a draw.
- [ ] The flag button gives up and awards the win to the partner.
- [ ] Game corner scoreboard and history include the finished game.
- [ ] A game that was already in progress before an update still opens (saved data unchanged).

### Solo arcade games (Hop Up, Wing It)
- [ ] Title screen shows the game name, how to play and the best score.
- [ ] Tap / click / Space starts. Pause and resume work; leaving the page stops the game.
- [ ] Game over shows the score, "New best!" when beaten, and Play again.
- [ ] Best score survives a page reload.
- [ ] No page scroll or tab swipe while playing; works with touch and with keyboard.
- [ ] Sound follows the app's sound switch (Profile → sound effects).

### Themes
- [ ] Each of the 8 skins: Home, Nest, Game corner, one two-player game, one arcade game —
      text readable, nothing clipped, buttons look like buttons.
- [ ] Changing colours in Appearance still recolours everything, including the games.
- [ ] With "reduce motion" on, nothing essential is hidden and nothing loops distractingly.

## 6. Things only a real device / real account can confirm

These cannot be verified in the sandbox; the owner (or an agent with access) should check:

- Real sign-in and two real accounts playing a two-player game with live realtime updates.
- Our Room with real furniture art next to the new game art (style match).
- Touch feel, sound and frame rate of the arcade games on an actual phone.
- The Capacitor phone build (`npm run build:spa`) on Android.

## 7. Deployment

Lovable builds and hosts from the `main` branch. Work happens on a feature branch; merging to
`main` syncs to Lovable. Never force-push (see `AGENTS.md`).
