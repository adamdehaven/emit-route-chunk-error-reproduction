<template>
  <div>
    <h1 data-testid="page-title">Index page</h1>
    <!-- Rendering MDC runs @nuxtjs/mdc's parser on the client during navigation, which fires the
         non-fatal `vite:preloadError` from `import('#mdc-imports')`. -->
    <MDC :value="markdown" data-testid="mdc" />
    <NuxtLink data-testid="link-other" to="/other">Go to /other</NuxtLink>
  </div>
</template>

<script setup lang="ts">
const markdown = '# Index content\n\nSome **markdown** rendered by `@nuxtjs/mdc`.'
</script>
