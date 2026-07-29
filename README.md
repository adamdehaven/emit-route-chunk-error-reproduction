# `emitRouteChunkError: 'automatic-immediate'` reloads the whole app on a non-fatal `vite:preloadError`

Minimal reproduction for a Nuxt 4.5.x issue. **No mocking or injected events** — the trigger is a
real, non-fatal `vite:preloadError` emitted by `@nuxtjs/mdc` during ordinary client navigation.

## Summary

With `experimental.emitRouteChunkError: 'automatic-immediate'`, Nuxt performs an **immediate
full-page reload (`reloadNuxtApp()`) on every `vite:preloadError` / `app:chunkError`** — including
**non-fatal** ones where the failing dynamic `import()` is caught and the navigation succeeds.

`emitRouteChunkError: 'automatic'` (the default) does not do this: it only reloads when the router
navigation actually fails. A non-fatal preload error is correctly ignored.

Practical effect with `'automatic-immediate'`: ordinary in-app `<NuxtLink>` navigations turn into
full document reloads (SPA state lost, no `_payload.json` fetch, a second `load` event).

## The natural trigger

`@nuxtjs/mdc`'s parser runs on the client when rendering `<MDC>` content and does:

```js
// node_modules/@nuxtjs/mdc/dist/runtime/parser/index.js
moduleOptions = await import("#mdc-imports" /* @vite-ignore */).catch(() => ({}))
generatedMdcConfigs = await import("#mdc-configs" /* @vite-ignore */).then(r => r.getMdcConfigs()).catch(() => [])
```

Because of `/* @vite-ignore */`, Vite never resolves `#mdc-imports` / `#mdc-configs`, so in the
browser these imports reject with `Failed to resolve module specifier '#mdc-imports'`. The
`.catch()` makes them **non-fatal** (MDC continues, the page renders fine), but the rejection still
fires a `vite:preloadError` → `app:chunkError`.

`app/plugins/log-preload-error.client.ts` logs these so the cause is visible in the browser console
(open DevTools during `pnpm preview`, or see the Playwright trace). On navigation you'll see:

```
[preload-error] vite:preloadError (defaultPrevented=false): Failed to resolve module specifier '#mdc-imports'
[preload-error] app:chunkError: Failed to resolve module specifier '#mdc-imports'
[preload-error] vite:preloadError (defaultPrevented=false): Failed to resolve module specifier '#mdc-configs'
[preload-error] app:chunkError: Failed to resolve module specifier '#mdc-configs'
```

These fire on **both** the broken and fixed builds (the error is non-fatal) — the only difference is
that `'automatic-immediate'` reloads the whole app in response, while `'automatic'` ignores it. (The
`#mdc-imports` resolution failure itself is arguably a separate `@nuxtjs/mdc` bug, but it is a
realistic, natural source of a non-fatal `vite:preloadError`.)

## Environment

- Nuxt: **4.5.1** (regressed between 4.4.8 → 4.5.x; 4.5.0 shipped Vite 8 + Rolldown + unhead 3)
- `@nuxtjs/mdc`: 0.22.x
- vue-router: 5.2.0, Vite: 8.1.x
- Node: v24
- Package manager: pnpm (any works)

## Reproduce

```bash
pnpm install
pnpm exec playwright install chromium

# BROKEN: experimental.emitRouteChunkError: 'automatic-immediate'
pnpm test:broken     # ❌ FAILS: a full-page reload happens during client-side navigation

# FIXED: experimental.emitRouteChunkError: 'automatic'
pnpm test:fixed      # ✅ PASSES: client-side navigation, no reload
```

See it in a browser:

```bash
pnpm build:broken && pnpm preview   # open http://localhost:3000, click "Go to /other" -> full reload
pnpm build:fixed  && pnpm preview   # click "Go to /other" -> instant SPA navigation
```

The reload is reliable (8/8 runs) and reproduces on the plain Node preset — no Cloudflare or other
hosting environment is required.

## Verify the fix at the source (patched `@nuxtjs/mdc`)

`nuxtjs-mdc-0.22.2.tgz` in this directory is a build of `@nuxtjs/mdc` with the one-line fix
(removing `/* @vite-ignore */` so `#mdc-imports` / `#mdc-configs` resolve on the client). Swapping
it in fixes the reload **at the source** — the `vite:preloadError` never fires, so
`emitRouteChunkError: 'automatic-immediate'` has nothing to react to.

```bash
# 1. See the bug first (published @nuxtjs/mdc):
pnpm build:broken && pnpm preview
#    open http://localhost:3000 with DevTools, click "Go to /other" -> FULL PAGE RELOAD,
#    console shows: [preload-error] ... Failed to resolve module specifier '#mdc-imports'

# 2. Install the patched build from the local tarball:
pnpm add @nuxtjs/mdc@file:./nuxtjs-mdc-0.22.2.tgz

# 3. Rebuild the SAME broken config and preview again:
pnpm build:broken && pnpm preview
#    click "Go to /other" -> instant SPA navigation, NO reload, NO [preload-error] in the console
#    (emitRouteChunkError is still 'automatic-immediate' — the MDC fix removed the trigger)
```

`pnpm test:broken` also flips from ❌ to ✅ after step 3.

## Expected vs actual

- **Expected:** a non-fatal `vite:preloadError` (the import is caught and the navigation completes)
  should not force a full-page reload. `'automatic'` behaves this way.
- **Actual:** `'automatic-immediate'` calls `reloadNuxtApp()` on the `app:chunkError` hook
  regardless of whether the navigation actually failed, causing a full reload on every navigation.

## Root cause

`vite:preloadError` is forwarded to `app:chunkError`:

- `packages/nuxt/src/app/nuxt.ts` — `window.addEventListener(chunkErrorEvent, e => nuxtApp.callHook('app:chunkError', { error: e.payload }))`

The two strategies then differ:

- **`automatic-immediate`** — `packages/nuxt/src/app/plugins/chunk-reload-immediate.client.ts`
  ```ts
  nuxtApp.hook('app:chunkError', () => reloadAppAtPath(currentlyNavigationTo ?? nuxtApp._route))
  ```
  Reloads on the raw hook, unconditionally — never checks whether the navigation actually failed.

- **`automatic`** — `packages/nuxt/src/app/plugins/chunk-reload.client.ts`
  ```ts
  nuxtApp.hook('app:chunkError', ({ error }) => { chunkErrors.add(error) })
  router.onError((error, to) => { if (chunkErrors.has(error)) reloadAppAtPath(to) })
  ```
  Records the error but only reloads if the router itself errors (the navigation truly failed).

So `'automatic-immediate'` treats every `app:chunkError` as fatal, even when the import was caught
and the navigation succeeded.

## Suggested direction

`'automatic-immediate'` should gate its reload on the navigation actually failing (as `'automatic'`
does), rather than reloading on any `app:chunkError` / non-fatal `vite:preloadError`.
