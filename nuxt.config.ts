// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  // @nuxtjs/mdc renders Markdown. Its client-side parser does
  //   `await import('#mdc-imports' /* @vite-ignore */).catch(() => ({}))`
  // which fails to resolve in the browser and fires a NON-FATAL `vite:preloadError`.
  // That is the real, natural trigger `emitRouteChunkError: 'automatic-immediate'` over-reacts to.
  modules: ['@nuxtjs/mdc'],

  experimental: {
    // The strategy under test. Toggle via the NUXT_EMIT_ROUTE_CHUNK_ERROR env var so the same
    // source builds the "broken" and "fixed" states without editing files:
    //   NUXT_EMIT_ROUTE_CHUNK_ERROR=automatic-immediate nuxi build   # reproduces the bug
    //   NUXT_EMIT_ROUTE_CHUNK_ERROR=automatic          nuxi build   # works as expected
    // Defaults to the buggy value so a plain `nuxi build` reproduces out of the box.
    emitRouteChunkError:
      (process.env.NUXT_EMIT_ROUTE_CHUNK_ERROR as 'automatic' | 'automatic-immediate' | 'manual' | false | undefined)
      ?? 'automatic-immediate',
  },
})
