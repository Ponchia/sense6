import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_SITE_PORT ?? '4174';
const baseURL = `http://127.0.0.1:${port}`;
const siteDirectory = process.env.PLAYWRIGHT_SITE_DIR;
const previewCommand = siteDirectory
  ? `npm --prefix ${JSON.stringify(siteDirectory)} run preview -- --port ${port} --strictPort`
  : `npm run preview -- --port ${port} --strictPort`;

export default defineConfig({
  testDir: './audits',
  fullyParallel: true,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/site-audit' }]],
  outputDir: 'test-results/site-audit',
  // Visual baselines are regenerated from the pull request's base SHA on the
  // same runner and container before every comparison, so a committed copy is
  // overwritten before it is ever read. They used to be committed anyway — 7.1 MB
  // whose only functional effect was that touching one removed its check from
  // the suite. They now live in the already-ignored test-results tree, which is
  // where a regenerated artifact belongs.
  snapshotPathTemplate:
    '{testDir}/../test-results/visual-baselines/{arg}{-projectName}{-snapshotSuffix}{ext}',
  workers: process.env.CI ? 4 : undefined,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: previewCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
