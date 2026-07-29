<template>
  <div>
    <h1 data-testid="page-title">Other page</h1>
    <MDC :value="markdown" data-testid="mdc" />
    <NuxtLink data-testid="link-index" to="/">Go to /</NuxtLink>
  </div>
</template>

<script setup lang="ts">
const markdown = '# Other content\n\nMore **markdown** rendered by `@nuxtjs/mdc`.'
</script>
