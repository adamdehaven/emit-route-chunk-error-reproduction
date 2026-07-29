import { expect, test } from '@playwright/test'

/**
 * A client-side (SPA) navigation triggered by clicking a <NuxtLink> must NOT cause a full
 * document load. We detect a full-page reload by counting the browser's top-level `load`
 * events: the initial `goto` fires exactly one; a correct SPA navigation fires none more.
 *
 * With experimental.emitRouteChunkError: 'automatic-immediate' (Nuxt 4.5.x) the click triggers
 * an immediate reloadNuxtApp(), so a second `load` fires and this test FAILS.
 * With 'automatic' (the default) no reload happens and the test PASSES.
 */
test('client-side navigation does not trigger a full-page reload', async ({ page }) => {
  let fullLoads = 0
  page.on('load', () => { fullLoads++ })

  await page.goto('/', { waitUntil: 'load' })
  await expect(page.getByTestId('page-title')).toHaveText('Index page')

  // Capture the per-load identity; a full reload wipes `window` and mints a new one.
  const bootIdBefore = await page.evaluate(() => (window as any).__nuxtBootId)
  expect(fullLoads).toBe(1)

  // Navigate purely client-side.
  await page.getByTestId('link-other').click()
  await page.waitForURL('**/other')
  await expect(page.getByTestId('page-title')).toHaveText('Other page')

  // Give any (buggy) immediate reload a chance to happen before asserting.
  await page.waitForLoadState('networkidle')

  const bootIdAfter = await page.evaluate(() => (window as any).__nuxtBootId)

  // The core assertion: no extra full document load occurred during client navigation.
  expect(fullLoads, 'a full-page reload occurred during client-side navigation').toBe(1)
  expect(bootIdAfter, 'window was wiped => full reload happened').toBe(bootIdBefore)
})
