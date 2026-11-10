/**
 * PHONE BUILD ONLY — stands in for the `@tanstack/react-start` package.
 *
 * That package is the server framework of the web app; a phone app has no server, and
 * bundling it there is what broke the phone build. The only piece client pages use from it is
 * `useServerFn`, which on a server-backed app wraps a server function for calling. In the
 * phone build the "server functions" are the plain stand-ins in `./admin.functions.ts`, so
 * handing the function straight back is all that is needed.
 *
 * If a page starts using something else from `@tanstack/react-start`, the phone build will
 * fail with "… is not exported by src/spa/react-start.ts" — add a client-safe stand-in here.
 */
export function useServerFn<T>(fn: T): T {
  return fn;
}
