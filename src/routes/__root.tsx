import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function applySavedTheme() {
  try {
    const raw = localStorage.getItem("blublub-theme-v2");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const root = document.documentElement;

    // New simple shape: { main, soft, purple, blue }
    if (parsed.main) {
      root.style.setProperty("--primary", parsed.main);
      root.style.setProperty("--ring", parsed.main);
      root.style.setProperty("--sidebar-primary", parsed.main);
      root.style.setProperty("--chart-1", parsed.main);

      root.style.setProperty("--petal", parsed.soft);
      root.style.setProperty("--peach", parsed.soft);
      root.style.setProperty("--secondary", parsed.soft);
      root.style.setProperty("--chart-5", parsed.soft);

      root.style.setProperty("--accent", parsed.purple);
      root.style.setProperty("--lavender", parsed.purple);
      root.style.setProperty("--sidebar-accent", parsed.purple);
      root.style.setProperty("--chart-2", parsed.purple);
      root.style.setProperty("--grad-featured-from", parsed.purple);
      root.style.setProperty("--grad-featured-to", parsed.main);
      root.style.setProperty("--grad-hero-from", parsed.main);
      root.style.setProperty("--grad-hero-to", parsed.purple);

      root.style.setProperty("--sky", parsed.blue);
      root.style.setProperty("--icy", parsed.blue === "#A2D2FF" ? "#BDE0FE" : parsed.blue);
      root.style.setProperty("--chart-3", parsed.blue);
      return;
    }

    // Old complex shape with colors object
    if (parsed.colors) {
      const c = parsed.colors;
      if (c.primary) {
        root.style.setProperty("--primary", c.primary);
        root.style.setProperty("--ring", c.primary);
        root.style.setProperty("--sidebar-primary", c.primary);
      }
      if (c.lavender) {
        root.style.setProperty("--lavender", c.lavender);
        root.style.setProperty("--accent", c.lavender);
      }
      if (c.petal) {
        root.style.setProperty("--petal", c.petal);
        root.style.setProperty("--peach", c.petal);
      }
      if (c.sky) root.style.setProperty("--sky", c.sky);
      if (c.icy) root.style.setProperty("--icy", c.icy);
    }
  } catch {
    // ignore
  }
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}`
      : String(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Error details
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-left text-[11px] leading-snug text-muted-foreground">
            {detail}
          </pre>
        </details>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { title: "BLUBLUB" },
      { name: "description", content: "A cozy private space for two." },
      { name: "theme-color", content: "#FFAFCC" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Apply saved theme colors on every page load
  useEffect(() => {
    applySavedTheme();
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
