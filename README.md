# Couple Connect Hub

Build a private couples-connection mobile-first web app called "BLUBLUB" from scratch.

CRITICAL — BACKEND SETUP: Do NOT enable Lovable Cloud for this project. Instead, connect to my external Supabase project ("blublub" under my "dridenn org" organization, project ref chthflbsqcjskalrrswd, Tokyo region) as the backend from the very start. Use its database, auth, and storage for everything below.

BRANDING: Light pink, cozy, warm color palette. Small cat, seal, and penguin illustrations spread lightly across all pages (not overwhelming — a few tasteful touches per page, not clutter). Rounded, soft UI components throughout. Cute short sound effects on button presses (toggleable off in settings).

CORE ACCOUNT & PAIRING:
- Email/password signup and login via Supabase auth
- After signup, user creates or joins a "couple space" via a unique 6-character invite code (or QR code) — two users pair into one shared private space
- Once paired, all couple features are scoped to that pair only, fully private from other users
- Profile with name, photo, relationship anniversary date

FEATURES (all fully functional, wired to the database, not placeholder UI):

1. SHARED CALENDAR & ANNIVERSARY TRACKER: shared calendar for events, days-together counter on the home dashboard, upcoming date reminders.

2. SHARED PHOTO TIMELINE: both partners upload photos with captions/dates to a shared scrollable timeline, newest first. Compress/resize images client-side before upload (target ~300-500KB per photo) to conserve storage.

3. DAILY CONNECTION QUESTIONS: one new question per day, both answer privately, answers reveal once both have answered. Include a small red notification dot on this feature when partner has answered and you haven't seen it yet.

4. SHARED TO-DO & GOALS: shared checklist plus a separate relationship goals list with progress tracking.

5. DATE NIGHT PLANNER: partners suggest date ideas, shared calendar of planned date nights, private notes section for intimacy planning — tasteful and non-explicit, focused on planning and connection.

6. UPGRADED BUDGET TRACKER (this is a flagship feature, build it rich): shared expense logging with category and who paid, running balance of who owes whom, spending insights with charts (by category, month-over-month comparison), shared budget goals per category with progress bars, a savings goal tracker for a joint fund (trip, ring, etc.) that both partners can contribute to and see progress toward, and recurring bill reminders with due dates.

7. COUPLE DIARY: private shared journal, dated entries with mood tag (emoji-based), viewable by both partners in a feed.

8. PERIOD TRACKING WITH PARTNER SHARING: tracking partner logs cycle data and predicted dates privately; opt-in toggle to share a simplified summary view (current phase + predicted next date only) with partner. This feature stays free for everyone, never paywalled.

9. PRIVATE CHAT: real-time in-app messaging between the two paired partners. Standard push notification (with a custom sound) for incoming messages when the app isn't open. Small red notification badge on the chat icon when there's an unread message.

PAYWALL / PREMIUM STRUCTURE:
- Two content areas are premium/locked in the public version: the Budget Tracker (feature 6) and an 18+ section (to be added in a later update — just build the paywall/unlock infrastructure now, generically, so it can gate any feature by a "premium" flag)
- Build a clean, reusable "premium gate" component/pattern that can wrap any feature and show an upgrade prompt instead of the feature when not unlocked
- Build a hidden personal-unlock mechanism: a special code enterable somewhere unobtrusive (e.g. a long-press on the profile screen, or a settings screen "redeem code" field) that unlocks all premium content permanently for that account, for my own personal use — pick a non-obvious placement for this
- For now, don't build real payment processing — just build the gating/lock UI and the personal-unlock code mechanism. Payment integration (in-app purchases) will come in a later update.

TECHNICAL REQUIREMENTS:
- Supabase (external project, not Lovable Cloud) for auth, database, storage, and real-time sync
- Mobile-first responsive layout — this will be wrapped into an Android APK via Capacitor, so avoid desktop-only interactions, hover-only UI, or non-touch-friendly controls
- Bottom tab navigation: Home, Calendar, Diary, Budget, Chat, More (goals/todos/date planner/period tracking under More)
- Row Level Security on all tables so couple data is private to that pair only
- Every feature must be fully wired to the database and working end-to-end, not static mockups

Please connect the external Supabase project first, then start with auth + couple pairing + home dashboard, then build the remaining features.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://blublub-together-always.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4973f502-5b26-44bb-a3d4-9e17e729e0d1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
