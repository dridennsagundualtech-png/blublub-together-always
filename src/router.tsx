import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Start loading a page's code as soon as a finger touches (or a mouse hovers) its link.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
