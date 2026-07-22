import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_DEPLOYED_PORT ?? '4175';
const localURL = `http://127.0.0.1:${port}`;
const deployedURL = process.env.PLAYWRIGHT_DEPLOYED_URL;
const canonicalProductionURL = 'https://sense6.net';

if (deployedURL) {
  const candidate = new URL(deployedURL);
  if (candidate.origin !== canonicalProductionURL || candidate.pathname !== '/') {
    throw new Error(`Refusing to run the deployed browser gate against ${candidate.href}`);
  }
}

export default defineConfig({
  testDir: './tests/deployed',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/deployed' }]],
  outputDir: 'test-results/deployed',
  use: {
    baseURL: deployedURL ? canonicalProductionURL : localURL,
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-deployed',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: deployedURL
    ? undefined
    : {
        command: `node scripts/serve-deployed-smoke.mjs ${port}`,
        url: localURL,
        reuseExistingServer: false,
      },
});
