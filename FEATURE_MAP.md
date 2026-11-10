# FEATURE_MAP

> What exists, where it lives, and what depends on what. "Must keep" means: do not remove or
> change behaviour without the owner's approval.

## Screens

| Feature | URL | Main files | Data (Supabase table) | Must keep |
| --- | --- | --- | --- | --- |
| Sign in / sign up | `/auth`, `/reset-password` | `routes/auth.tsx`, `components/SignInPanel.tsx` | auth | yes |
| Pairing (invite code) | shown inside any page | `components/CoupleGate.tsx`, `lib/session.ts` | `couples`, `profiles` | yes |
| Home dashboard | `/` | `routes/_authenticated/index.tsx`, `components/FeelingTile.tsx` | several | yes |
| Calendar | `/calendar` | `routes/_authenticated/calendar.tsx`, `lib/calendar-sources.ts` | `events` | yes |
| Chat + floating chat head | `/chat` | `components/ChatThread.tsx`, `components/ChatHead.tsx` | `messages` | yes |
| Our Nest (hub) | `/nest` | `routes/_authenticated/nest.tsx` | — | yes |
| Diary | `/diary` | `routes/_authenticated/diary.tsx` | `diary_entries` | yes |
| To-dos | `/todos` | `routes/_authenticated/todos.tsx` | `todos`, `goals` | yes |
| Bucket list | `/bucket` | `routes/_authenticated/bucket.tsx` | `bucket_list` | yes |
| Budget (premium) | `/budget` | `routes/_authenticated/budget.tsx`, `components/PremiumGate.tsx` | `expenses`, `budget_goals`, `savings_*`, `bills` | yes |
| Memories (photos) | `/photos` | `routes/_authenticated/photos.tsx`, `lib/signed-urls.ts` | `photos`, `photo_reactions`, `photo_comments` | yes |
| Memory Book (PDF) | `/memory-book` | `routes/_authenticated/memory-book.tsx`, `lib/memory-book.ts`, `lib/style-paint.ts` | `photos` | yes |
| Look Back video | from Memories | `components/LookBack.tsx`, `lib/lookback-*.ts` | several | yes |
| Daily questions | `/questions` | `routes/_authenticated/questions.tsx` | `questions`, `question_answers` | yes |
| Wellbeing hub | `/wellbeing` | `routes/_authenticated/wellbeing.tsx` | — | yes |
| Cool-down | `/cooldown` | `routes/_authenticated/cooldown.tsx`, `lib/feelings.ts` | `cooldowns` | yes |
| Cycle tracking | `/period` | `routes/_authenticated/period.tsx` | `cycle_logs` | yes |
| Commitments | `/commitments` | `routes/_authenticated/commitments.tsx`, `lib/commitments.ts` | `commitments`, `commitment_logs` | yes |
| Map | `/map` | `routes/_authenticated/map.tsx`, `components/WorldMap.tsx`, `components/MiniMap.tsx`, `lib/location.ts` | `locations` | yes |
| Food roulette | `/food` | `routes/_authenticated/food.tsx`, `lib/food-art.ts` | — | yes |
| 18+ dice (premium) | `/spicy` | `routes/_authenticated/spicy.tsx`, `components/games/DiceRoller.tsx` | — | yes |
| Profile & settings | `/profile` | `routes/_authenticated/profile.tsx` | `profiles`, `redeem_codes` | yes |
| Appearance | `/appearance` | `components/StylePicker.tsx`, `components/ThemeEditor.tsx`, `components/DevThemeHost.tsx`, `lib/theme.ts` | `couples.theme` | yes |
| Admin | `/admin-codes`, `/admin-users` | `routes/_authenticated/admin-*.tsx`, `lib/admin*.ts` | `redeem_codes`, `user_roles` | yes |

## Our Room (the "main game")

| Part | Files |
| --- | --- |
| Page | `routes/_authenticated/games.index.tsx` (URL `/games`, the "Play" tab) |
| Stage (drag, rotate, layer, mascots, seed) | `components/room/RoomStage.tsx` |
| Data + actions | `lib/room.ts`, tables `rooms`, `room_items`, `room_unlocks` |
| Catalog of furniture / backgrounds / seed | `lib/room-catalog.ts`, `lib/room-backgrounds.ts`, `lib/room-seed.ts` (auto-generated lists) |
| Love Points | `lib/love-points.ts` (earned by daily habits, spent on furniture and rooms) |

Pixel art here is an image pack hosted by Lovable. It is the visual reference for all games.

## Game corner

URL `/games/arcade` — `routes/_authenticated/games.arcade.tsx`. Lists every game, the lifetime
scoreboard and the game history.

### Two-player loser-task games — `/games/$kind`

Flow (shared by all five): **lock in a task → play → result card shows who owes the task.**

| Piece | File |
| --- | --- |
| Route | `routes/_authenticated/games.$kind.tsx` |
| Shared flow (start card, result card) | `components/games/GameShell.tsx` |
| Task + give-up bar (give up = two taps) | `components/games/TaskBar.tsx` |
| Shared pixel pieces (stage frame, player bar, sparkles) | `components/games/pixel-kit.tsx` |
| How a finished game ended (final board / score) | `components/games/Recap.tsx` |
| Game list | `components/games/registry.ts`, labels in `lib/games.ts` (`GAME_META`) |
| Data hooks | `lib/games.ts` — table `games`, kept live with Supabase realtime |
| Tic-Tac-Toe | `components/games/TicTacToe.tsx` |
| Rock Paper Scissors | `components/games/Rps.tsx` |
| Memory Match | `components/games/Memory.tsx` |
| Connect Four | `components/games/ConnectFour.tsx` |
| War | `components/games/War.tsx` |

**Do not change** the shape of the saved `state` JSON of these games or the `kind` strings:
games in progress and the history rely on them. Visual changes only.

### Solo arcade games — `/games/play/$game`

| Piece | File |
| --- | --- |
| Route | `routes/_authenticated/games.play.$game.tsx` |
| Host component (menus, pause, game over) | `arcade/ArcadeCabinet.tsx` |
| Game list | `arcade/registry.ts` |
| Best scores (device only) | `arcade/scores.ts` → `localStorage["blublub:arcade:best:<game>"]` |
| Engine | `arcade/engine/*` |
| Hop Up (platformer: climb higher = more points) | `arcade/games/hop/*` |
| Wing It (flap through gaps) | `arcade/games/wing/*` |
| Shared arcade art (hearts, clouds, sky, mascot sprites) | `arcade/art.ts` |
| Sprite component for menus | `arcade/PixelSprite.tsx` |
| Pixel look shared by all games | `src/pixel.css` (`.pixel-zone`, `px-*`) |

No Supabase. No login needed to play.

## Things many screens share (change with care)

| Shared piece | File | Used by |
| --- | --- | --- |
| Page frame + theme apply | `components/AppLayout.tsx` | every page |
| Tab bar, swipe between tabs | `components/BottomNav.tsx`, `hooks/useSwipeTabs.ts` | every page |
| Cards, buttons, inputs, section titles | `components/ui-kit.tsx` | almost every page |
| Mascots | `components/Doodles.tsx`, `components/pixel-critters.ts` | every page header, games, room |
| Pixel icons / reaction emoji | `components/pixel-art.tsx` | photos, chat |
| Design tokens + shared classes | `styles.css` | everything |
| App styles (skins) | `skins.css`, `lib/theme.ts` (`SKINS`) | everything |
| Sound effects | `hooks/use-sound.ts` | everything |
| Notification dots | `lib/badges.ts`, `lib/notifications.ts` | tab bar, hubs, games |
| Session (user, couple, partner) | `lib/session.ts` | everything |

## Dependencies between features

- Game corner badges (red dots) ← `lib/badges.ts` reads the `games` table.
- Our Room Love Points ← daily question + shared feelings (`lib/love-points.ts`).
- Memory Book and Look Back paint with the current skin ← `lib/style-paint.ts` mirrors `skins.css`.
  If a skin's look changes a lot, check those two as well.
- Premium gating (`PremiumGate`, premium skins) ← `profiles.is_premium` / redeem codes.
