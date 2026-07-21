import { expect, test } from '@playwright/test';

test('a dynamic route import failure renders a recoverable route boundary', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser route failure injection');
  const pageErrors = capturePageErrors(page);
  await page.goto('/en/');
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await page.route('**/src/journal.js*', (route) => route.abort('failed'));

  await page.getByRole('link', { name: 'Journal', exact: true }).click();

  await expectRouteFailure(page);
  await recoverToGallery(page);
  expect(pageErrors).toEqual([]);
});

test('a locale load failure uses the same recoverable route boundary', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser route failure injection');
  const pageErrors = capturePageErrors(page);
  await page.goto('/en/');
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await page.route('**/src/locales/de.js*', (route) => route.abort('failed'));

  await page.evaluate(() => {
    const nextIndex = (window.history.state?.__sense6Index ?? 0) + 1;
    window.history.pushState({ ...window.history.state, __sense6Index: nextIndex }, '', '/de/about/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  await expectRouteFailure(page);
  await recoverToGallery(page);
  expect(pageErrors).toEqual([]);
});

test('a route commit failure retires the outgoing lifecycle and keeps routing available', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser route failure injection');
  const pageErrors = capturePageErrors(page);
  await page.goto('/en/udito/');
  await page.locator('[data-action="au-setup"]').click();
  await expect(page.locator('body')).toHaveClass(/lab-mode/);
  await page.evaluate(() => {
    const app = document.querySelector('#app');
    const getBounds = app.getBoundingClientRect.bind(app);
    app.getBoundingClientRect = () => {
      app.getBoundingClientRect = getBounds;
      throw new Error('deterministic commit failure');
    };
  });

  await page.getByRole('link', { name: 'About', exact: true }).click();

  await expectRouteFailure(page);
  await expect(page.locator('body')).not.toHaveClass(/lab-mode|measurement-active/);
  await recoverToGallery(page);
  expect(pageErrors).toEqual([]);
});

test('a translation failure during commit does not strand the router', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser route failure injection');
  const pageErrors = capturePageErrors(page);
  await page.goto('/en/');
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await page.evaluate(() => {
    const createTreeWalker = document.createTreeWalker.bind(document);
    document.createTreeWalker = (...args) => {
      document.createTreeWalker = createTreeWalker;
      throw new Error(`deterministic translation failure for ${args.length} arguments`);
    };
  });

  await page.getByRole('link', { name: 'About', exact: true }).click();

  await expectRouteFailure(page);
  await recoverToGallery(page);
  expect(pageErrors).toEqual([]);
});

test('a throwing controller mount disposes its partial lifecycle', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser route failure injection');
  const pageErrors = capturePageErrors(page);
  await page.route('**/src/exams/udito.js*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
        import { createExamLifecycle } from '/src/lib/lifecycle.js';
        const owner = Symbol('throwing-controller');
        export function mount(context) {
          const lifecycle = createExamLifecycle(owner, { bodyClasses: ['failed-mount'] });
          document.body.classList.add('failed-mount');
          lifecycle.onCleanup(() => {
            window.__failedMountCleanups = (window.__failedMountCleanups ?? 0) + 1;
          });
          lifecycle.setActive(true);
          context.app.innerHTML = '<section><h1>Partial controller view</h1></section>';
          throw new Error('deterministic controller mount failure');
        }
      `,
    }),
  );
  await page.goto('/en/');
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();

  await page.locator('.exam-card__link[data-sense6-route="udito"]').click();

  await expectRouteFailure(page);
  await expect.poll(() => page.evaluate(() => window.__failedMountCleanups ?? 0)).toBe(1);
  await expect(page.locator('body')).not.toHaveClass(/failed-mount|measurement-active/);
  await expect(page.locator('[data-locale-select]')).toBeEnabled();
  await expect(page.locator('[data-bronto-theme-toggle]')).toBeEnabled();
  await recoverToGallery(page);
  expect(pageErrors).toEqual([]);
});

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function expectRouteFailure(page) {
  await expect(page.getByRole('heading', { name: 'Page unavailable.' })).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'error');
  await expect(page.locator('#app')).toHaveJSProperty('inert', false);
}

async function recoverToGallery(page) {
  await page.locator('#app').getByRole('link', { name: 'All tests', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'gallery');
}
