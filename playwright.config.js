import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '4173';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    colorScheme: 'light',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/cross-browser.spec.js', '**/deployed/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testIgnore: ['**/cross-browser.spec.js', '**/deployed/**'],
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    {
      name: 'chromium-smoke',
      testMatch: '**/cross-browser.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: '**/cross-browser.spec.js',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: '**/cross-browser.spec.js',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  // The browser matrix must exercise the artifact that ships, not the Vite dev
  // server. `vite.config.js` has no SPA-fallback override, so under `npm run
  // dev` a request for `/en/tetracromia/` fell through to the raw root
  // `index.html` and the pre-rendered pages produced by
  // `scripts/generate-static-pages.mjs` were never loaded by a browser —
  // leaving the static-HTML-to-hydration contract, which broke in production
  // twice in eight days, with no cross-browser coverage at all.
  //
  // `scripts/serve-deployed-smoke.mjs` serves `dist` and replays `dist/_headers`,
  // so the suite now runs against the real pre-rendered HTML, the real hashed
  // bundles, the real 404 page, and an enforced Content-Security-Policy.
  webServer: {
    command: `npm run build && node scripts/serve-deployed-smoke.mjs ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
