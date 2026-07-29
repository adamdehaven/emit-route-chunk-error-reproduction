/**
 * Makes the cause obvious in the browser console.
 *
 * It logs the non-fatal `vite:preloadError` (and the `app:chunkError` Nuxt derives from it) so you
 * can see that @nuxtjs/mdc's client-side `import('#mdc-imports')` failure is the event that
 * `experimental.emitRouteChunkError: 'automatic-immediate'` over-reacts to with a full reload.
 *
 * Expected output when navigating between the pages:
 *   [preload-error] vite:preloadError (defaultPrevented=false): Failed to resolve module specifier '#mdc-imports'
 *   [preload-error] app:chunkError: Failed to resolve module specifier '#mdc-imports'
 *   [preload-error] vite:preloadError (defaultPrevented=false): Failed to resolve module specifier '#mdc-configs'
 *   [preload-error] app:chunkError: Failed to resolve module specifier '#mdc-configs'
 *
 * These fire on BOTH the broken and fixed builds (the error is non-fatal) - the only difference is
 * that 'automatic-immediate' reloads the whole app in response, while 'automatic' ignores it.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }

  window.addEventListener('vite:preloadError', (e) => {
    const ev = e as Event & { payload?: Error }
    console.warn(`[preload-error] vite:preloadError (defaultPrevented=${e.defaultPrevented}): ${ev.payload?.message ?? ''}`)
  })

  nuxtApp.hook('app:chunkError', ({ error }) => {
    console.warn(`[preload-error] app:chunkError: ${(error as Error)?.message ?? ''}`)
  })
})
