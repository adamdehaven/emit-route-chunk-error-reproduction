# @nuxtjs/mdc issue draft

> File at: https://github.com/nuxt-modules/mdc/issues/new (or https://github.com/nuxt/mdc).
> Replace `<REPRODUCTION_URL>` with the pushed reproduction.

---

**Title:** Client-side `import('#mdc-imports' /* @vite-ignore */)` fails to resolve in the browser (`Failed to resolve module specifier`), firing a `vite:preloadError` on every MDC render

### Environment

- `@nuxtjs/mdc`: 0.22.x
- Nuxt: 4.5.1, Vite: 8.1.x
- Node: 24.x

### Reproduction

<REPRODUCTION_URL>

A minimal Nuxt 4.5.1 app rendering `<MDC :value="..." />`.

### What is happening

`dist/runtime/parser/index.js`'s `createParseProcessor` runs on the client when rendering MDC and does:

```js
moduleOptions = await import("#mdc-imports" /* @vite-ignore */).catch(() => ({}))
generatedMdcConfigs = await import("#mdc-configs" /* @vite-ignore */).then(r => r.getMdcConfigs()).catch(() => [])
```

Because of `/* @vite-ignore */`, Vite does not resolve/transform these virtual-module specifiers, so
in the **browser** they reject with:

```
Failed to resolve module specifier '#mdc-imports'
Failed to resolve module specifier '#mdc-configs'
```

The `.catch()` keeps parsing working (it falls back to empty options), so functionally MDC still
renders. But every client-side parse:

1. Logs a console error (`Failed to resolve module specifier '#mdc-imports'`), and
2. Emits a `vite:preloadError` (with `defaultPrevented=false`).

The `vite:preloadError` is a problem beyond console noise: downstream consumers react to it. In
particular, Nuxt's `experimental.emitRouteChunkError: 'automatic-immediate'` reloads the entire app
on it, turning ordinary client navigations into full-page reloads (companion Nuxt core issue:
`<NUXT_CORE_ISSUE_URL>`).

### Steps to reproduce

```bash
pnpm install
pnpm build            # production build
pnpm preview          # node .output/server/index.mjs
# open http://localhost:3000 with DevTools open, navigate between pages that render <MDC>
# -> console: "Failed to resolve module specifier '#mdc-imports'" + a vite:preloadError each nav
```

(The included `app/plugins/log-preload-error.client.ts` also logs the `vite:preloadError` / `app:chunkError`.)

### Expected behavior

`#mdc-imports` / `#mdc-configs` should resolve on the client (or the import should be guarded to run
server-side only, or not be `@vite-ignore`-d), so that no `Failed to resolve module specifier`
error and no `vite:preloadError` is emitted in the browser.

### Actual behavior

`import('#mdc-imports')` / `import('#mdc-configs')` reject on the client on every MDC parse, emitting
a console error and a non-fatal `vite:preloadError`.
