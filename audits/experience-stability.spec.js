import { expect, test } from '@playwright/test';

const ADOPTED_ROUTES = [
  ['/en/', 'gallery'],
  ['/en/about/', 'about'],
  ['/en/privacy/', 'privacy'],
];

for (const [route, view] of ADOPTED_ROUTES) {
  test(`${route} adopts its static view without replacing it`, async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });
    page.on('requestfailed', (request) =>
      runtimeErrors.push(`${request.url()}: ${request.failure()?.errorText}`),
    );
    await observeInitialView(page);
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.locator(`#app[data-sense6-hydrated="${view}"]`).waitFor();
    await page.locator(`[data-sense6-view="${view}"] h1`).waitFor();
    await page.evaluate(async () => document.fonts?.ready);

    const result = await page.evaluate((expectedView) => {
      const current = document.querySelector(`[data-sense6-view="${expectedView}"]`);
      return {
        adopted: Boolean(current && window.__sense6InitialView === current),
        cls: window.__sense6LayoutShift ?? 0,
      };
    }, view);

    expect(result.adopted).toBe(true);
    expect(result.cls).toBeLessThan(0.05);
    expect(runtimeErrors).toEqual([]);
  });
}

test('route-owned CSS stays deterministic after cross-route navigation', async ({ page }) => {
  await page.goto('/en/', { waitUntil: 'networkidle' });
  const acuityPreview = page.locator('.exam-card__visual--acutezza .mini-acuity i');
  await expect(acuityPreview).toBeVisible();
  expect(await acuityPreview.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(
    60,
  );

  await page.goto('/en/color-blindness/', { waitUntil: 'networkidle' });
  await expect(page.locator('.cb-intro')).toBeVisible();
  await page.locator('.brand').click();
  await expect(page.locator('[data-sense6-view="gallery"]')).toBeVisible();
  await page.locator('[data-sense6-route="tetracromia"]').first().click();
  await expect(page.locator('.tetracromia-hero')).toBeVisible();

  expect(await page.locator('body').evaluate((body) => body.classList.contains('cb-active'))).toBe(false);
  const leakingSelectors = await page.evaluate(() => {
    const selectorsIn = (rules) =>
      [...rules].flatMap((rule) =>
        rule.cssRules
          ? selectorsIn(rule.cssRules)
          : typeof rule.selectorText === 'string'
            ? [rule.selectorText]
            : [],
      );
    return [...document.styleSheets]
      .filter((sheet) => sheet.href?.includes('color-blindness'))
      .flatMap((sheet) => selectorsIn(sheet.cssRules))
      .filter(
        (selector) =>
          /(^|[\s,])\.(setup-view|setup-panel|results-view|results-head|results-actions)(?=[\s,.:#>+~]|$)/.test(
            selector,
          ) && !selector.includes('.cb-active'),
      );
  });
  expect(leakingSelectors).toEqual([]);
});

test('the outgoing route remains visible while the next route chunk loads', async ({ page }) => {
  let releaseChunk;
  const chunkReleased = new Promise((resolve) => {
    releaseChunk = resolve;
  });
  let chunkRequested;
  const requested = new Promise((resolve) => {
    chunkRequested = resolve;
  });
  await page.route(/\/assets\/udito-.+\.js$/, async (route) => {
    chunkRequested();
    await chunkReleased;
    await route.continue();
  });

  await page.goto('/en/', { waitUntil: 'networkidle' });
  await page.locator('[data-sense6-route="udito"]').first().click();
  await requested;
  await expect(page.locator('[data-sense6-view="gallery"]')).toBeVisible();
  releaseChunk();
  await expect(page.locator('.au-intro')).toBeVisible();
});

test('accepted navigation retires the outgoing experiment before a destination chunk fails', async ({
  page,
}) => {
  await page.goto('/en/udito/', { waitUntil: 'networkidle' });
  await page.locator('#app[data-sense6-hydrated="udito"]').waitFor();
  await page.locator('[data-action="au-setup"]').click();
  await expect(page.locator('body')).toHaveClass(/lab-mode/);
  await page.route(/\/assets\/gallery-.+\.css$/, (route) => route.abort('failed'));

  await page.locator('.brand').click();
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'error');
  await expect(page.locator('h1')).toHaveText('Page unavailable.');
  await expect(page.locator('body')).not.toHaveClass(/lab-mode/);
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '');
});

test('RTL decorative instruments keep a physical coordinate system', async ({ page }) => {
  await page.goto('/ar/', { waitUntil: 'networkidle' });
  await expect(page.locator('.sense-mark')).toBeVisible();
  expect(await page.locator('.sense-mark__field').evaluate((node) => getComputedStyle(node).direction)).toBe(
    'ltr',
  );

  await page.goto('/ar/about/', { waitUntil: 'networkidle' });
  expect(await page.locator('.about-orbit').evaluate((node) => getComputedStyle(node).direction)).toBe('ltr');

  await page.goto('/ar/udito/', { waitUntil: 'networkidle' });
  expect(await page.locator('.au-scope__dial').evaluate((node) => getComputedStyle(node).direction)).toBe(
    'ltr',
  );

  await page.goto('/ar/riflessi/', { waitUntil: 'networkidle' });
  const progressOrigin = await page.evaluate(() => {
    const progress = document.createElement('span');
    progress.className = 'rx-progress';
    progress.style.inlineSize = '100px';
    progress.innerHTML = '<i></i>';
    document.body.append(progress);
    const indicator = progress.firstElementChild;
    const originX = Number.parseFloat(getComputedStyle(indicator).transformOrigin);
    const width = indicator.offsetWidth;
    progress.remove();
    return { originX, width };
  });
  expect(progressOrigin.originX).toBeCloseTo(progressOrigin.width, 1);
});

test.describe('ambient motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('is subtle, finite, and transform-based', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'networkidle' });
    expect(await animationOf(page, '.mini-reflex span')).toMatchObject({ iterations: '1' });

    await page.goto('/en/tetracromia/', { waitUntil: 'networkidle' });
    expect(await animationOf(page, '.color-orbit', '::before')).toMatchObject({ iterations: '1' });

    await page.goto('/en/riflessi/', { waitUntil: 'networkidle' });
    expect(await animationOf(page, '.rx-scope__sweep')).toMatchObject({ iterations: '1' });

    await page.goto('/en/udito/', { waitUntil: 'networkidle' });
    expect(await animationOf(page, '.au-wave i')).toMatchObject({ iterations: '2' });

    expect(await ambientKeyframeProperties(page)).toEqual(['opacity', 'transform']);
  });
});

test('reduced motion leaves ambient instruments static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/', { waitUntil: 'networkidle' });
  expect(await animationOf(page, '.mini-reflex span')).toMatchObject({ name: 'none' });

  await page.goto('/en/udito/', { waitUntil: 'networkidle' });
  expect(await animationOf(page, '.au-wave i')).toMatchObject({ name: 'none' });

  await page.goto('/en/tetracromia/', { waitUntil: 'networkidle' });
  expect(await animationOf(page, '.color-orbit', '::before')).toMatchObject({ name: 'none' });

  await page.goto('/en/riflessi/', { waitUntil: 'networkidle' });
  await page.locator('[data-action="rx-setup"]').click();
  expect(await animationOf(page, '.rx-calibration__pulse i')).toMatchObject({ name: 'none' });
});

async function observeInitialView(page) {
  await page.addInitScript(() => {
    window.__sense6InitialView = null;
    window.__sense6LayoutShift = 0;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          const view = node.matches('[data-sense6-view]') ? node : node.querySelector('[data-sense6-view]');
          if (view && !window.__sense6InitialView) window.__sense6InitialView = view;
        }
      }
    }).observe(document, { childList: true, subtree: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__sense6LayoutShift += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

async function animationOf(page, selector, pseudo = null) {
  return page
    .locator(selector)
    .first()
    .evaluate((element, pseudoElement) => {
      const style = getComputedStyle(element, pseudoElement);
      return {
        iterations: style.animationIterationCount,
        name: style.animationName,
      };
    }, pseudo);
}

async function ambientKeyframeProperties(page) {
  return page.evaluate(() => {
    const names = new Set(['au-wave', 'bar-in', 'orbit', 'rx-preview-sweep', 'rx-pulse', 'rx-scope-sweep']);
    const properties = new Set();
    const visit = (rules) => {
      for (const rule of rules) {
        if (rule instanceof CSSKeyframesRule && names.has(rule.name)) {
          for (const frame of rule.cssRules) {
            for (const property of frame.style) properties.add(property);
          }
        } else if (rule.cssRules) {
          visit(rule.cssRules);
        }
      }
    };
    for (const sheet of document.styleSheets) visit(sheet.cssRules);
    return [...properties].sort();
  });
}
