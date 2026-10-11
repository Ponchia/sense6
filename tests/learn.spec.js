import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LEARN_ROUTES } from '../src/routes.js';

test('the Learn page links to original research guides and returns to the lab @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/');
  await expect(page.locator('.gallery-learn')).toBeVisible();
  await page.locator('.gallery-learn [data-sense6-route="learn"]').click();
  await expect(page).toHaveURL(/\/en\/learn\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'learn');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Perception, explained.');
  await expect(page.locator('.learn-topic')).toHaveCount(LEARN_ROUTES.length - 1);
  await page.locator('.learn-topic [data-sense6-route="tetrachromacy-guide"]').click();
  await expect(page).toHaveURL(/\/en\/tetrachromacy-guide\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'tetrachromacy-guide');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Can an online test detect tetrachromacy?',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://sense6.net/social/tetracromia.png',
  );
  await expect(page.locator('.learn-article__body section')).toHaveCount(4);
  await expect(page.locator('.learn-references li')).toHaveCount(3);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/en/tetrachromacy-guide/',
  );
  await page.locator('.learn-experiment a').click();
  await expect(page).toHaveURL(/\/en\/tetracromia\/$/);
  await expect(page.locator('h1')).toContainText('Tetracromia');
});

test('the mobile research answer offers its experiment before the long article @pr-smoke', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/reaction-time-guide/');
  const early = page.locator('.learn-answer [data-learn-early-experiment]');
  await expect(early).toBeVisible();
  await expect(early).toHaveText(/Try the short reaction lab/);
  await expect(early).toHaveAttribute('href', '/en/riflessi/?scope=signal');
  const geometry = await early.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      fitsScreenWidth: rect.left >= 0 && rect.right <= document.documentElement.clientWidth,
      answerBeforeContents:
        (document
          .querySelector('.learn-answer')
          ?.compareDocumentPosition(document.querySelector('.learn-contents')) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
        0,
    };
  });
  expect(geometry).toEqual({ fitsScreenWidth: true, answerBeforeContents: true });
  await early.click();
  await expect(page).toHaveURL(/\/en\/riflessi\/\?scope=signal$/);
  await expect(page.locator('[data-rx-scope-picker] [data-scope="signal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-rx-consent]')).not.toBeChecked();
  await expect(page.locator('[data-action="rx-start"]')).toBeDisabled();
});

test('the accessible hypothetical timing model responds on a real mobile viewport @pr-smoke', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/reaction-time-guide/');
  const model = page.locator('[data-learn-timing]');
  const display = model.locator('[data-timing-display]');
  const input = model.locator('[data-timing-input]');
  await expect(display).toBeEnabled();
  await expect(input).toBeEnabled();
  await expect(model.locator('[data-timing-total]')).toHaveText('248 ms');
  await display.focus();
  await display.press('End');
  await expect(model.locator('[data-timing-total]')).toHaveText('282 ms');
  await input.focus();
  await input.press('Home');
  await expect(model.locator('[data-timing-total]')).toHaveText('270 ms');
  await expect(model.locator('[data-timing-meter]')).toHaveAttribute('value', '270');
  const layout = await model.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, viewport: document.documentElement.clientWidth };
  });
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewport);
  await expect(model).toContainText('not a latency measurement, calibration or correction formula');
  await page.locator('[data-learn-early-experiment]').click();
  await expect(page).toHaveURL(/\/en\/riflessi\/\?scope=signal$/);
  await expect(page.locator('[data-learn-timing]')).toHaveCount(0);
});

test('reaction guide explains hardware delay without short-circuiting consent @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/reaction-time-guide/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'How accurate is a reaction-time test in a browser?',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://sense6.net/social/riflessi.png',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/en/reaction-time-guide/',
  );
  await expect(page.getByText(/not an instrument-calibrated measurement/i)).toBeVisible();
  await page.locator('.learn-experiment a').click();
  await expect(page).toHaveURL(/\/en\/riflessi\/\?scope=signal$/);
  await expect(page.locator('[data-rx-scope-picker] [data-scope="signal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-rx-consent]')).not.toBeChecked();
  await expect(page.locator('[data-action="rx-start"]')).toBeDisabled();
});

test('the colour-vision guide explains limitations and leads to real Daltonia @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/');
  const articleLink = page.locator('.gallery-learn [data-sense6-route="color-blindness-guide"]');
  await expect(articleLink).toBeVisible();
  await articleLink.click();
  await expect(page).toHaveURL(/\/en\/color-blindness-guide\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'color-blindness-guide');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What can an online colour-blindness test tell you?',
  );
  await expect(page.locator('.learn-article__body section')).toHaveCount(4);
  await expect(page.locator('.learn-references li')).toHaveCount(3);
  await expect(page.locator('.learn-answer')).toContainText('cannot, by itself, confirm or rule out');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/en/color-blindness-guide/',
  );
  await page.locator('.learn-experiment a').click();
  await expect(page).toHaveURL(/\/en\/color-blindness\/$/);
  await expect(page.getByRole('heading', { name: /Find the gap in the dots/i })).toBeVisible();
});

test('hearing and sharpness guides answer their question and link to real experiments @pr-smoke', async ({
  page,
}) => {
  for (const [route, experiment] of [
    ['hearing-range-guide', 'udito'],
    ['visual-acuity-guide', 'acutezza'],
  ]) {
    await page.goto(`/en/${route}/`);
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', route);
    await expect(page.locator('.learn-answer')).toContainText(/cannot|not an audiogram/i);
    await expect(page.locator('.learn-references li')).toHaveCount(4);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://sense6.net/en/${route}/`,
    );
    await page.locator('.learn-experiment a').click();
    await expect(page).toHaveURL(new RegExp(`/en/${experiment}/$`));
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', experiment);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('readers can jump to a topic and trace its background sources without leaving the guide @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/tetrachromacy-guide/');
  const contents = page.getByRole('navigation', { name: 'On this page' });
  await expect(contents).toBeVisible();
  await expect(contents.getByRole('link')).toHaveCount(5);

  await contents.locator('a[href="#learn-section-2"]').click();
  await expect(page).toHaveURL(/\/en\/tetrachromacy-guide\/#learn-section-2$/);
  const screenLimitSection = page.locator('section[aria-labelledby="learn-section-2"]');
  await expect(screenLimitSection.locator('.learn-section-sources a')).toHaveCount(2);
  await screenLimitSection.locator('a[href="#learn-source-css-color-4"]').click();
  await expect(page).toHaveURL(/#learn-source-css-color-4$/);

  const citedSource = page.locator('#learn-source-css-color-4');
  await expect(citedSource).toBeVisible();
  await expect(citedSource).toBeFocused();
  await expect(citedSource.locator('.learn-reference-role')).toHaveText('[2] Display engineering standard');
  await expect(citedSource.getByRole('link')).toHaveAttribute('href', 'https://www.w3.org/TR/css-color-4/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/en/tetrachromacy-guide/',
  );
});

test('Learn language switching retains the topic where translated and falls back safely otherwise @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/reaction-time-guide/');
  await page.locator('[data-locale-select]').selectOption('it');
  await expect(page).toHaveURL(/\/it\/reaction-time-guide\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'reaction-time-guide');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tempi di reazione');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/it/reaction-time-guide/',
  );
  await page.locator('[data-locale-select]').selectOption('es');
  await expect(page).toHaveURL(/\/es\/reaction-time-guide\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tiempo de reacción');
  await page.locator('[data-locale-select]').selectOption('de');
  await expect(page).toHaveURL(/\/de\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'gallery');
  await expect(page.locator('main h1')).toBeVisible();
});

test('Italian and Spanish Learn content remains readable and internally linked on mobile @pr-smoke', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const locale of ['it', 'es']) {
    await page.goto(`/${locale}/learn/`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'learn');
    await expect(page.locator('.learn-topic')).toHaveCount(5);
    const sectionLink = page.locator('.learn-topic [data-sense6-route="tetrachromacy-guide"]');
    await sectionLink.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/tetrachromacy-guide/$`));
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'tetrachromacy-guide');
    await expect(page.locator('.learn-article__body section')).toHaveCount(4);
    await expect(page.locator('.learn-references li')).toHaveCount(3);
    const source = page.locator('.learn-section-sources a').first();
    await expect(source).toHaveAttribute('href', /#learn-source-/);
    await source.click();
    await expect(page).toHaveURL(/#learn-source-/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://sense6.net/${locale}/tetrachromacy-guide/`,
    );
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(3);
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll, `${locale} must not cause horizontal overflow`).toBe(dimensions.width);
    await page.locator('.learn-experiment a').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/tetracromia/$`));
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'tetracromia');
  }
});

test('all Learn pages remain readable and accessible at a narrow viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Full Learn page accessibility covered in Chromium');
  await page.setViewportSize({ width: 320, height: 568 });
  for (const route of LEARN_ROUTES) {
    await page.goto(`/en/${route}/`);
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', route);
    await expect(page.locator('main h1')).toBeVisible();
    if (route !== 'learn') {
      await expect(page.getByRole('heading', { level: 2, name: 'Short answer' })).toBeVisible();
      const reading = await page.locator('.learn-article__body').evaluate((body) => {
        const text = body.querySelector('p');
        const style = getComputedStyle(text);
        return { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
      });
      expect(reading.fontSize).toBeGreaterThanOrEqual(16);
      expect(reading.lineHeight / reading.fontSize).toBeGreaterThanOrEqual(1.6);
    }
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations, route).toEqual([]);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `${route} should not scroll horizontally`).toBe(dimensions.viewport);
  }
});

test('Learn navigation updates Article identity and retires claims when returning to a gallery', async ({
  page,
}) => {
  await page.goto('/en/');
  await page.locator('.gallery-learn [data-sense6-route="tetrachromacy-guide"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'tetrachromacy-guide');
  const article = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts
        .flatMap((script) => JSON.parse(script.textContent)['@graph'] ?? [])
        .find((entry) => entry['@type'] === 'Article'),
    );
  expect(article.inLanguage).toBe('en');
  expect(article.url).toBe('https://sense6.net/en/tetrachromacy-guide/');
  expect(article.dateModified).toBe(await page.locator('.learn-hero time').getAttribute('datetime'));
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(3);
  await expect(page.locator('link[rel="alternate"][hreflang="it"]')).toHaveAttribute(
    'href',
    'https://sense6.net/it/tetrachromacy-guide/',
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await page.locator('.learn-breadcrumb [data-sense6-route=""]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'gallery');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sense6.net/en/');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  const claims = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts
        .flatMap((script) => JSON.parse(script.textContent)['@graph'] ?? [])
        .filter((entry) => ['Article', 'CollectionPage'].includes(entry['@type'])),
    );
  expect(claims).toEqual([]);
});
