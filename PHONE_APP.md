# PHONE_APP — making the Android app (APK)

> How BLUBLUB becomes an installable Android app. Written for someone who is not a programmer.

## The three steps, and what each one makes

| Step | What it does | What you get |
| --- | --- | --- |
| 1. Phone build | Packs the app into plain web files that need no server | the `dist/` folder |
| 2. Capacitor | Copies those files into an Android app shell (a full-screen browser window) | the `android/` project, updated |
| 3. Android Studio | Compiles that project | the `.apk` file you install |

Steps 1 and 2 are one command. Step 3 needs Android Studio, because it contains Android's
build tools.

## Set up once (on your own computer)

1. Install **Node.js 22 or newer** (nodejs.org) and **Android Studio** (developer.android.com/studio,
   latest version). Open Android Studio once and let it finish its first-run downloads.
2. Download the project from GitHub and open a terminal in its folder.
3. Install the project's packages:

```bash
npm install
```

## Every time you want a new APK

```bash
npm run phone:sync
```

That rebuilds the app and copies it into the Android project. Then:

```bash
npm run phone:open
```

Android Studio opens the project. Wait until the loading bar at the bottom is finished, then
use the menu **Build → Generate App Bundles or APKs → Generate APKs** (on older versions:
**Build → Build APK(s)**). When it says "APK(s) generated", click **locate**. The file is:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Send that file to the phone (cable, Drive, chat to yourself…), tap it, and allow "install
unknown apps" when Android asks.

**Shortcut with the phone plugged in** (USB debugging switched on in the phone's Developer
options) — builds, installs and starts the app in one go:

```bash
npm run phone:run
```

## Good to know

- **Always build on the same computer.** Each computer signs the APK with its own key. An APK
  from a different computer will refuse to install over the old one ("App not installed") until
  the old one is uninstalled — which also wipes what is saved on the phone (the login and the
  arcade best scores).
- **The app's identity is `com.blublub.app`** (in `capacitor.config.ts`). Never change it once
  the app is installed on your phones: Android would treat it as a different app. If you
  already have a BLUBLUB app made some other way, this one installs next to it as a second app.
- **It needs the internet**, like the web app: your data lives in the same place.
- **Our Room pictures come from the live web app.** Furniture, backgrounds and some feeling
  icons are stored by Lovable, so the phone app fetches them from
  `https://blublub-together-always.lovable.app`. Keep the web app published. If it ever moves
  to another address, change `WEB_APP_ORIGIN` in `vite.config.spa.ts`.
- **Permissions it asks for**: location (location sharing and the map) and microphone (voice
  notes). Both are asked the first time you use the feature and the app works without them.

## What is different from the web app

- **Member access** (the owner's page for premium and 18+ switches) only works in the web app.
  In the phone app it says so.
- **System notifications do not appear.** Android's in-app browser has no web notifications,
  so reminders and "new message" banners only show while the app is open. Fixing that needs a
  native notifications plugin — not done.
- This is a **debug** APK: fine for the two of you. Publishing on Google Play needs a signed
  release build and a developer account — not set up.

## Changing the icon

The icon and the start-up screen are drawn from the app's own pixel cat by
`scripts/phone/make-android-art.py` (the command to run is at the top of that file; it needs
Python with Pillow). To use another mascot or colour, edit the command or the two colours at
the top of the script and run it again, then `npm run phone:sync`.

## For developers and AI agents

| Piece | File |
| --- | --- |
| Capacitor settings (app id, name, web folder) | `capacitor.config.ts` |
| Android project (commit it; build outputs and the copied web files are git-ignored) | `android/` |
| Permissions | `android/app/src/main/AndroidManifest.xml` |
| Phone build config: server stand-ins, hosted-picture addresses | `vite.config.spa.ts`, `src/spa/` |
| Phone entry point | `src/main.spa.tsx`, `spa/index.html` |
| Commands | `phone:sync`, `phone:open`, `phone:run` in `package.json` |
| Check that the built app runs | `scripts/visual/spa-smoke.mjs` (see TESTING_GUIDE) |

Capacitor 8 needs Node 22+, JDK 21 and Android SDK 36 (Android Studio provides the last two).
The three `@capacitor/*` packages must always be the same version.
