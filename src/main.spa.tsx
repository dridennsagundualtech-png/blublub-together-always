// Client-only entry used for the Capacitor / static SPA build (`npm run build:spa`).
// The default `npm run build` still produces the SSR build used by Lovable hosting.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
