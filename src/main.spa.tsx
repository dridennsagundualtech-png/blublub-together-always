// Client-only entry used for the Capacitor / static SPA build (`npm run build:spa`).
// The default `npm run build` still produces the SSR build used by Lovable hosting.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

// Mount on the whole document, not on a box inside it. The app's outer frame
// (`RootShell` in routes/__root.tsx) draws <html>, <head> and <body> itself — that is how the
// web version works. Mounted inside a <div> in the body, React ended up owning the body from
// within the body and froze the page in an endless loop on the first touch.
createRoot(document).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
