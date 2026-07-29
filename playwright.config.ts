import { defineConfig, devices } from '@playwright/test'

// Runs the PRODUCTION build (this bug does not reproduce with `nuxi dev`).
// Build first with one of:
//   pnpm build:broken   # experimental.emitRouteChunkError: 'automatic-immediate'  -> test FAILS
//   pnpm build:fixed    # experimental.emitRouteChunkError: 'automatic'            -> test PASSES
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Serve the existing production build (.output). Build separately via the scripts above.
    command: 'node .output/server/index.mjs',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
