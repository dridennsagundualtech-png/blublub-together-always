import { createContext, useContext } from "react";

/** Opens the side bar (More). Provided by the signed-in layout (routes/_authenticated/route.tsx). */
export const SideMenuContext = createContext<() => void>(() => {});
export const useOpenSideMenu = () => useContext(SideMenuContext);
