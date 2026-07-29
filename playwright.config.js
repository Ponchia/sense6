import { defineConfig, devices } from '@playwright/test';

/**
 * Two servers, deliberately.
 *
 * The cross-browser matrix used to run against the Vite dev server. Because
 * `vite.config.js` has no SPA-fallback override, a request for
 * `/en/tetracromia/` fell through to the raw root `index.html`, so the
 * pre-rendered pages produced by `scripts/generate-static-pages.mjs` were never
 * loaded by a browser — and the static-HTML-to-hydration contract, the exact
 * thing that broke in production twice in eight days, had no cross-browser
 * coverage at all. `chromium-smoke`, `firefox`, and `webkit` therefore now run
 * against `dist` served by `scripts/serve-deployed-smoke.mjs`, which replays
 * `dist/_headers` and so enforces the real Content-Security-Policy.
 *
 * `chromium` and `mobile` stay on the dev server, and that is a constraint
 * rather than a preference. The accelerated instrument fixtures those suites
 * depend on are read behind `import.meta.env.DEV` — see
 * src/exams/acutezza.js:1063, src/exams/riflessi.js:1130,
 * src/exams/udito.js:1052, and src/exams/color-blindness.js:800 — which Vite
 * compiles to `false` in a production build. The hooks are absent from the
 * shipped bundle, so against `dist` every fixture-driven journey falls back to
 * the full-length protocol and times out. Moving those projects onto the
 * artifact requires a build-visible test hook in `src/`; until then this split
 * is the strongest honest configuration.
 */
const devPort = process.env.PLAYWRIGHT_PORT ?? '4173';
const distPort = process.env.PLAYWRIGHT_DIST_PORT ?? '4176';
const devURL = `http://127.0.0.1:${devPort}`;
const distURL = `http://127.0.0.1:${distPort}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: devURL,
    colorScheme: 'light',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/cross-browser.spec.js', '**/deployed/**'],
      use: { ...devices['Desktop Chrome'], baseURL: devURL },
    },
    {
      name: 'mobile',
      testIgnore: ['**/cross-browser.spec.js', '**/deployed/**'],
      use: { ...devices['iPhone 13'], browserName: 'chromium', baseURL: devURL },
    },
    {
      name: 'chromium-smoke',
      testMatch: '**/cross-browser.spec.js',
      use: { ...devices['Desktop Chrome'], baseURL: distURL },
    },
    {
      name: 'firefox',
      testMatch: '**/cross-browser.spec.js',
      use: { ...devices['Desktop Firefox'], baseURL: distURL },
    },
    {
      name: 'webkit',
      testMatch: '**/cross-browser.spec.js',
      use: { ...devices['Desktop Safari'], baseURL: distURL },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${devPort} --strictPort`,
      url: devURL,
      reuseExistingServer: false,
    },
    {
      command: `npm run build && node scripts/serve-deployed-smoke.mjs ${distPort}`,
      url: distURL,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
