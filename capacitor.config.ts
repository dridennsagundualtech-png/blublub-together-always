import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wraps the phone build of the app (the `dist/` folder made by `npm run build:spa`)
 * into an Android app. The Android project itself lives in `android/`.
 *
 * Everyday use:  npm run phone:sync   — rebuild the app and copy it into the Android project
 *                npm run phone:open   — open the Android project in Android Studio
 */
const config: CapacitorConfig = {
  // The app's permanent identity on a phone. Android treats a different id as a different app
  // (separate install, separate saved login), so never change it once people have installed it.
  appId: "com.blublub.app",
  appName: "BLUBLUB",
  // Where `npm run build:spa` puts the phone build.
  webDir: "dist",
};

export default config;
