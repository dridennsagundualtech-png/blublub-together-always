import { useCallback, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatHead } from "@/components/ChatHead";
import { SideMenu } from "@/components/SideMenu";
import { SideMenuContext } from "@/lib/side-menu";

/**
 * The app is browsable signed out — signing in happens inside Profile & Settings.
 * Data still requires a session (RLS), so signed-out pages simply render empty.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: SignedInLayout,
});

/** Every screen, plus what floats over all of them: the chat head and the side bar (More). */
function SignedInLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  return (
    <SideMenuContext.Provider value={openMenu}>
      <Outlet />
      <ChatHead />
      <SideMenu open={menuOpen} onClose={closeMenu} />
    </SideMenuContext.Provider>
  );
}
