import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { EXAMS } from '../src/exams/registry.js';
import { LOCALES, loadMessages, localeMetadata } from '../src/locales.js';
import { privacyCopy } from '../src/privacy.js';

test('the gallery lists exams, is accessible, and routes into one', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await expect(page.locator('.brand')).toHaveText('Sense6');
  await expect(page.locator('.brand')).not.toContainText('Perception lab');
  await expect(page.locator('.sense-mark')).toHaveText('Sense6');
  await expect(page.locator('.sense-mark__signal')).toHaveCount(6);
  await expect(page.locator('.sense-map')).toHaveCount(0);
  if ((await page.viewportSize()).width >= 960) {
    const heroHeight = await page
      .locator('.gallery-hero')
      .evaluate((hero) => hero.getBoundingClientRect().height);
    expect(heroHeight, 'gallery hero should not behave like a full-screen poster').toBeLessThan(
      (await page.viewportSize()).height * 0.92,
    );
  }
  await expect(page.locator('.exam-card__link[href="/en/tetracromia/"]')).toBeVisible();
  await expect(page.locator('.exam-card__link[href="/en/color-blindness/"]')).toBeVisible();
  await expect(page.locator('.exam-card__link[href="/en/riflessi/"]')).toBeVisible();
  await expect(page.locator('.exam-card__link[href="/en/udito/"]')).toBeVisible();
  await expect(page.locator('.exam-card__link[href="/en/acutezza/"]')).toBeVisible();
  await expect(page.locator('.roadmap-item')).toHaveCount(0);
  await expect(page.locator('.gallery-hero__actions, .gallery-proof, .principles')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Try Udito|Explore all four tests/i })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const darkResults = await new AxeBuilder({ page }).analyze();
  expect(darkResults.violations).toEqual([]);

  await page.locator('.exam-card__link[href="/en/color-blindness/"]').click();
  await expect(page).toHaveURL(/\/en\/color-blindness\/$/);
  await expect(page.getByRole('heading', { name: /Find the gap in the dots/i })).toBeVisible();
});

test('legacy locale hashes resolve to the matching canonical path', async ({ page }) => {
  await page.goto('/#/it/udito');
  await expect(page).toHaveURL(/\/it\/udito\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /Ascolta il limite/i })).toBeVisible();
});

test('regional language-tag paths redirect to canonical locale routes', async ({ page }) => {
  for (const [regionalPath, canonicalPath] of [
    ['/pt-BR/udito/', '/pt-br/udito/'],
    ['/pt-PT/', '/pt/'],
    ['/zh-CN/acutezza/', '/zh-hans/acutezza/'],
  ]) {
    await page.goto(regionalPath);
    await expect(page).toHaveURL(new RegExp(`${canonicalPath.replaceAll('/', '\\/')}$`));
  }
});

test('language routes translate, persist, and remain accessible', async ({ page }) => {
  await page.goto('/it/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page).toHaveTitle('Sense6 — misura ciò che i tuoi sensi percepiscono');
  await expect(page.locator('[data-locale-select] option')).toHaveText(LOCALES.map(({ label }) => label));
  await expect(page.getByRole('heading', { name: 'Inizia da ciò che vuoi scoprire.' })).toBeVisible();
  await expect(page.locator('.exam-card__link[href="/it/udito/"]')).toBeVisible();

  for (const { code, languageTag, direction } of LOCALES) {
    const messages = await loadMessages(code);
    await page.locator('[data-locale-select]').selectOption(code);
    await expect(page).toHaveURL(new RegExp(`/${code}/$`));
    await expect(page.locator('html')).toHaveAttribute('lang', languageTag);
    await expect(page.locator('html')).toHaveAttribute('dir', direction);
    const heading = messages.get('Start with what you want to learn.');
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await page.locator('[data-locale-select]').selectOption('de');
  await page.reload();
  await expect(page.locator('[data-locale-select]')).toHaveValue('de');
  await page.locator('.exam-card__link[href="/de/udito/"]').click();
  await expect(page.getByRole('heading', { name: /Hören Sie auf die Grenze/i })).toBeVisible();
  await expect(page).toHaveTitle(/Gerätebezogenes Hörlabor/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the privacy notice describes the deployed data boundary in every locale', async ({ page }) => {
  await page.goto('/en/');
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/privacy\/$/);
  await expect(page.getByRole('heading', { level: 1, name: privacyCopy('en').title })).toBeVisible();
  await expect(page.getByRole('link', { name: 'privacy@sense6.net' })).toHaveCount(2);
  await expect(page.getByText(/UTC day, test name, event name, and total count/i)).toBeVisible();
  await expect(page.getByText(/does not store IP addresses, identifiers, fingerprints/i)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  for (const { code, languageTag, direction } of LOCALES) {
    await page.goto(`/${code}/privacy/`);
    await expect(page.locator('html')).toHaveAttribute('lang', languageTag);
    await expect(page.locator('html')).toHaveAttribute('dir', direction);
    await expect(page.getByRole('heading', { level: 1, name: privacyCopy(code).title })).toBeVisible();
    await expect(page.getByRole('link', { name: 'privacy@sense6.net' })).toHaveCount(2);
  }
});

test('language and theme controls do not overlap at narrow header widths', async ({ page }) => {
  for (const width of [320, 375, 640]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/en/');
    for (const { code } of LOCALES) {
      await page.locator('[data-locale-select]').selectOption(code);
      await expect(page).toHaveURL(new RegExp(`/${code}/$`));

      const geometry = await page.evaluate(() => {
        const localeElement = document.querySelector('[data-locale-select]');
        const locale = localeElement.getBoundingClientRect();
        const localeStyle = getComputedStyle(localeElement);
        const theme = document.querySelector('[data-bronto-theme-toggle]').getBoundingClientRect();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${localeStyle.fontWeight} ${localeStyle.fontSize} ${localeStyle.fontFamily}`;
        const label = localeElement.selectedOptions[0].textContent;
        const letterSpacing = Number.parseFloat(localeStyle.letterSpacing) || 0;
        const labelWidth = context.measureText(label).width + Math.max(0, label.length - 1) * letterSpacing;
        const labelSpace =
          locale.width -
          Number.parseFloat(localeStyle.paddingInlineStart) -
          Number.parseFloat(localeStyle.paddingInlineEnd);
        return {
          controlsOverlap: !(locale.right <= theme.left || theme.right <= locale.left),
          labelFits: labelWidth <= labelSpace,
          viewportWidth: document.documentElement.clientWidth,
          contentWidth: document.documentElement.scrollWidth,
        };
      });

      expect(geometry.controlsOverlap, `${code} controls overlap at ${width}px`).toBe(false);
      expect(geometry.labelFits, `${code} language label is clipped at ${width}px`).toBe(true);
      expect(geometry.contentWidth, `${code} header overflows at ${width}px`).toBeLessThanOrEqual(
        geometry.viewportWidth,
      );
    }
  }
});

test('every live exam has a localized entry point in every language', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Localization routing is viewport-independent');
  test.setTimeout(90_000);
  const headingSources = {
    tetracromia: ['How finely do you', 'see', 'colour?'],
    'color-blindness': ['Find the gap', 'in the dots'],
    riflessi: ['Notice the signal.', 'Measure the response.'],
    udito: ['Listen for the boundary.', 'Keep the limits audible.'],
    acutezza: ['Calibrate the screen.', 'Resolve the opening.'],
  };
  for (const { code, languageTag } of LOCALES) {
    const messages = await loadMessages(code);
    for (const { route } of EXAMS) {
      await page.goto(`/${code}/${route}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', languageTag);
      const expected = headingSources[route].map((source) => escapeRegex(messages.get(source))).join('\\s*');
      const suffix = route === 'color-blindness' ? '\\.' : '';
      await expect(page.locator('main h1')).toHaveText(new RegExp(`^${expected}${suffix}$`, 'u'));
      await expect(page.locator('[data-locale-select]')).toHaveValue(code);
    }
  }

  await page.goto('/en/udito/');
  await page.locator('[data-locale-select]').selectOption('es');
  await expect(page).toHaveURL(/\/es\/udito\/$/);
  await expect(page.locator('main h1')).toContainText('Escucha el límite', { ignoreCase: true });
});

test('Arabic uses RTL reading order without reversing physical response directions', async ({ page }) => {
  await page.goto('/ar/color-blindness/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  const backArrow = page.locator('.exam-back > span[aria-hidden="true"]');
  expect(await backArrow.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');

  await page.locator('[data-action="cb-setup"]').click();
  await page.locator('#cb-ready').check();
  await page.locator('#cb-start').click();
  const positions = await page.evaluate(() => ({
    left: document.querySelector('[data-orientation="left"]').getBoundingClientRect().left,
    right: document.querySelector('[data-orientation="right"]').getBoundingClientRect().left,
  }));
  expect(positions.left).toBeLessThan(positions.right);
  await page.locator('[data-orientation="left"]').click();
  const feedback = page.locator('.cb-practice-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).not.toContainText(/The gap is on|This clear practice gap is on/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the first visit follows a supported browser language', async ({ browser }) => {
  const port = process.env.PLAYWRIGHT_PORT ?? '4173';
  const context = await browser.newContext({
    locale: 'fr-FR',
    baseURL: `http://127.0.0.1:${port}`,
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/fr\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(
    page.getByRole('heading', { name: /Commencez par ce que vous souhaitez découvrir/i }),
  ).toBeVisible();
  await context.close();

  for (const [browserLocale, route] of [
    ['pt-BR', 'pt-br'],
    ['zh-CN', 'zh-hans'],
    ['ar-EG', 'ar'],
  ]) {
    const regionalContext = await browser.newContext({
      locale: browserLocale,
      baseURL: `http://127.0.0.1:${port}`,
    });
    const regionalPage = await regionalContext.newPage();
    await regionalPage.goto('/');
    await expect(regionalPage).toHaveURL(new RegExp(`/${route}/$`));
    await expect(regionalPage.locator('html')).toHaveAttribute('lang', localeMetadata(route).languageTag);
    await regionalContext.close();
  }
});

test('long German labels remain inside the mobile viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only localization geometry check');
  await page.goto('/de/udito/');
  await page.getByRole('button', { name: /Hörlabor vorbereiten/i }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);

  await page.goto('/de/acutezza/');
  await page.getByRole('button', { name: /Sehlabor vorbereiten/i }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
