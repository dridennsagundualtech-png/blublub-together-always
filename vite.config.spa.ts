// Static SPA build for Capacitor (Android/iOS). No SSR, no server runtime.
// Output: dist/ with index.html at its root.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
  // The SPA entry HTML lives in spa/ so it is never served by the SSR deployment.
  root: path.resolve(process.cwd(), "spa"),
  publicDir: path.resolve(process.cwd(), "public"),
  plugins: [
    tsConfigPaths({ root: process.cwd() }),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: path.resolve(process.cwd(), "src/routes"),
      generatedRouteTree: path.resolve(process.cwd(), "src/routeTree.gen.ts"),
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    // Order matters: the two exact swaps must come before the general "@" shortcut.
    alias: [
      // A phone app has no server. The web app's server-only pieces are swapped for small
      // client-safe stand-ins (see the notes at the top of each file in src/spa/).
      {
        find: /^@\/lib\/admin\.functions$/,
        replacement: path.resolve(process.cwd(), "src/spa/admin.functions.ts"),
      },
      {
        find: /^@tanstack\/react-start$/,
        replacement: path.resolve(process.cwd(), "src/spa/react-start.ts"),
      },
      { find: "@", replacement: path.resolve(process.cwd(), "src") },
    ],
  },
  base: "./",
  build: {
    outDir: path.resolve(process.cwd(), "dist"),
    emptyOutDir: true,
  },
});
