<script setup lang="ts">
// Record every time the Nuxt app boots (i.e. every full document load / hydration).
// A client-side (SPA) navigation must NOT increment this; a full-page reload will.
// We stash the count on `window` so a Playwright test can read it, and also render it
// so the behaviour is visible when running `nuxi preview` in a browser.
const boots = useState('boot-count', () => 0)

if (import.meta.client) {
  boots.value++
  // Expose booted flag on window: it is wiped by a real reload, kept across SPA navigation.
  ;(window as unknown as { __nuxtBootId?: number }).__nuxtBootId ??= Date.now()
}
</script>

<template>
  <div>
    <p>
      client boots (hydrations): <strong data-testid="boot-count">{{ boots }}</strong>
    </p>
    <NuxtPage />
  </div>
</template>
