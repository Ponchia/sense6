import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { expect, test } from '@playwright/test';

const origin = 'https://sense6.net';
const root = resolve(import.meta.dirname, '../dist');
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

test.use({ serviceWorkers: 'block' });

for (const excluded of [false, true]) {
  test(`@pr-smoke production-origin measurements ${excluded ? 'stay excluded' : 'have a positive control'}`, async ({
    page,
  }) => {
    const metrics = [];
    const beacons = [];
    const unexpected = [];
    // No route continues to the network. The origin is production-like, but
    // every first-party byte is the local candidate and every measurement is inert.
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin && url.pathname === '/api/metric') {
        metrics.push(route.request().postDataJSON());
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      if (url.hostname === 'static.cloudflareinsights.com') {
        beacons.push(url.href);
        await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
        return;
      }
      if (url.pathname.startsWith('/cdn-cgi/rum')) {
        unexpected.push(url.href);
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      if (url.origin !== origin) {
        unexpected.push(url.href);
        await route.abort();
        return;
      }
      try {
        let file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
        if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error('Outside fixture');
        // Read first and fall back on EISDIR, so no check-then-use window exists.
        let body;
        try {
          body = await readFile(file);
        } catch (error) {
          if (error?.code !== 'EISDIR') throw error;
          file = resolve(file, 'index.html');
          body = await readFile(file);
        }
        await route.fulfill({
          status: 200,
          contentType: mime[extname(file)] ?? 'application/octet-stream',
          body,
        });
      } catch {
        await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Fixture not found' });
      }
    });
    await page.goto(`${origin}/en/tetracromia/${excluded ? '?metrics=off' : ''}`);
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'tetracromia');
    await page.waitForLoadState('networkidle');
    if (!excluded) {
      expect(metrics).toContainEqual({ event: 'site_loaded', test: 'site' });
      expect(metrics).toContainEqual({ event: 'test_viewed', test: 'tetracromia' });
      expect(beacons).toHaveLength(1);
    }

    // Mount another real experiment after the initial flag has left the URL.
    // This is a same-document router transition, not a fresh page with a flag.
    await page.evaluate(() => {
      history.pushState(null, '', '/en/riflessi/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'riflessi');
    await page.waitForLoadState('networkidle');
    if (excluded) {
      expect(metrics).toEqual([]);
      expect(beacons).toEqual([]);
      await expect(page.locator('script[data-cf-beacon]')).toHaveCount(0);
    } else {
      expect(metrics).toContainEqual({ event: 'test_viewed', test: 'riflessi' });
      expect(beacons).toHaveLength(1);
    }
    expect(unexpected).toEqual([]);
  });
}
