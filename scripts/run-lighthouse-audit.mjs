import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { SEARCH_REPRESENTATIVE_ROUTES, SEARCH_ROUTES } from '../audits/routes.js';

// Keep the same four audit categories and mobile/throttled profile used by the
// former Unlighthouse gate, without its Puppeteer/server dependency chain.
// Both CI modes use an explicit source-owned route allowlist: no crawler,
// sitemap discovery, hidden sampling or arbitrary third-party destinations.
const CATEGORY_IDS = Object.freeze(['performance', 'accessibility', 'best-practices', 'seo']);
const site = new URL(process.env.LIGHTHOUSE_SITE ?? 'http://127.0.0.1:4174');
if (
  site.protocol !== 'http:' ||
  !['127.0.0.1', 'localhost'].includes(site.hostname) ||
  site.pathname !== '/'
) {
  throw new Error('Lighthouse may audit only a local Sense6 preview root');
}

const routes = process.env.FULL_SITE_AUDIT === '1' ? SEARCH_ROUTES : SEARCH_REPRESENTATIVE_ROUTES;
const output = resolve(process.env.LIGHTHOUSE_OUTPUT_PATH ?? '.lighthouse');
const reports = resolve(output, 'reports');
const executable = process.env.LIGHTHOUSE_CHROME_PATH ?? chromium.executablePath();
if (process.env.CI && process.env.LIGHTHOUSE_CHROME_PATH) {
  throw new Error('CI must use the Chromium binary supplied by its pinned Playwright image');
}

await rm(output, { recursive: true, force: true });
await mkdir(reports, { recursive: true });
const chrome = await launch({
  chromePath: executable,
  chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
});
let succeeded = 0;
try {
  for (const [index, route] of routes.entries()) {
    const url = new URL(route, site).href;
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: [...CATEGORY_IDS],
      formFactor: 'mobile',
      throttlingMethod: 'simulate',
    });
    const report = result?.lhr;
    if (!report || report.runtimeError) {
      throw new Error(
        `${route}: Lighthouse failed: ${JSON.stringify(report?.runtimeError ?? 'missing result')}`,
      );
    }
    const path = new URL(report.finalDisplayedUrl).pathname;
    if (path !== route) throw new Error(`${route}: audited unexpected path ${path}`);
    const slug = route === '/' ? 'root' : route.replaceAll('/', '-').replace(/^-|-$/g, '');
    const target = resolve(reports, slug, 'lighthouse.json');
    await mkdir(resolve(reports, slug), { recursive: true });
    await writeFile(target, JSON.stringify(report));
    succeeded += 1;
    const scores = CATEGORY_IDS.map((id) => `${id}=${Math.round((report.categories[id]?.score ?? 0) * 100)}`);
    console.log(`[${index + 1}/${routes.length}] ${route} ${scores.join(' ')}`);
  }
} finally {
  await chrome.kill();
}
if (succeeded !== routes.length) throw new Error(`Audited only ${succeeded}/${routes.length} routes`);
console.log(`Saved ${succeeded} audited Lighthouse reports under ${reports}`);
