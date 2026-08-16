import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * The app is browsable signed out — signing in happens inside Profile & Settings.
 * Data still requires a session (RLS), so signed-out pages simply render empty.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => <Outlet />,
});
