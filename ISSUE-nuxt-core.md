# Nuxt core issue draft

> File at: https://github.com/nuxt/nuxt/issues/new (Bug report). Replace `<REPRODUCTION_URL>` with
> the pushed reproduction (e.g. a GitHub repo of this folder, or fork the Nuxt starter and add
> `@nuxtjs/mdc`).

---

**Title:** `experimental.emitRouteChunkError: 'automatic-immediate'` triggers a full-page reload on a non-fatal `vite:preloadError` during client navigation

### Environment

- Nuxt: 4.5.1
- Vite: 8.1.x (rolldown), vue-router: 5.2.0
- Node: 24.x
- OS: macOS (arm64)
- Builder: vite
- Package manager: pnpm

### Reproduction

<REPRODUCTION_URL>

A minimal Nuxt 4.5.1 app with `@nuxtjs/mdc` and `experimental.emitRouteChunkError: 'automatic-immediate'`.

### Steps to reproduce

```bash
pnpm install
pnpm exec playwright install chromium
pnpm test:broken   # experimental.emitRouteChunkError: 'automatic-immediate' -> FAILS (full-page reload on client nav)
pnpm test:fixed    # experimental.emitRouteChunkError: 'automatic'           -> PASSES (SPA nav)
```

Or manually: `pnpm build:broken && pnpm preview`, open http://localhost:3000, open DevTools, and click
"Go to /other". With `'automatic-immediate'` the app does a full document reload instead of a
client-side navigation. The console shows the harmless preload error that causes it:

```
[preload-error] vite:preloadError (defaultPrevented=false): Failed to resolve module specifier '#mdc-imports'
[preload-error] app:chunkError: Failed to resolve module specifier '#mdc-imports'
```

### What is happening

`vite:preloadError` is forwarded to the `app:chunkError` hook
(`packages/nuxt/src/app/nuxt.ts`). The two `emitRouteChunkError` strategies react very differently:

- **`automatic-immediate`** — `packages/nuxt/src/app/plugins/chunk-reload-immediate.client.ts`
  ```ts
  nuxtApp.hook('app:chunkError', () => reloadAppAtPath(currentlyNavigationTo ?? nuxtApp._route))
  ```
  Reloads on the raw hook, **unconditionally** — it never checks whether the navigation actually failed.

- **`automatic`** — `packages/nuxt/src/app/plugins/chunk-reload.client.ts`
  ```ts
  nuxtApp.hook('app:chunkError', ({ error }) => { chunkErrors.add(error) })
  router.onError((error, to) => { if (chunkErrors.has(error)) reloadAppAtPath(to) })
  ```
  Records the error and only reloads if the router itself errors (the navigation truly failed).

A **non-fatal** `vite:preloadError` (the dynamic import is `.catch()`-ed and the navigation still
completes) therefore forces a full reload under `'automatic-immediate'`, while `'automatic'`
correctly ignores it. In this reproduction the non-fatal event is emitted by `@nuxtjs/mdc`'s
client-side `import('#mdc-imports' /* @vite-ignore */).catch(...)` (see the companion `@nuxtjs/mdc`
issue), but **any** non-fatal `vite:preloadError` reproduces the same behavior.

### Expected behavior

`'automatic-immediate'` should not reload the app when the navigation succeeded — it should gate the
reload on an actual navigation/router failure (as `'automatic'` does), or otherwise ignore
non-fatal `vite:preloadError` events where the import resolved/was handled.

### Actual behavior

Every client navigation that emits a non-fatal `vite:preloadError` becomes a full document reload
(SPA state lost, no `_payload.json` fetch, a second `load` event).
