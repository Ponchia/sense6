import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectInVisualViewport, expectNoHorizontalOverflow } from './helpers/browser.js';

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

test('language routes translate, persist, and remain accessible', async ({ page }) => {
  const expectations = {
    it: 'Inizia da ciò che vuoi scoprire.',
    de: 'Beginnen Sie mit dem, was Sie erfahren möchten.',
    fr: 'Commencez par ce que vous souhaitez découvrir.',
    es: 'Empieza por lo que quieres descubrir.',
    pt: 'Comece pelo que deseja descobrir.',
  };

  await page.goto('/it/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page).toHaveTitle('Sense6 — misura ciò che i tuoi sensi percepiscono');
  await expect(page.locator('[data-locale-select] option')).toHaveText([
    'English',
    'Italiano',
    'Deutsch',
    'Français',
    'Español',
    'Português',
  ]);
  await expect(page.getByRole('heading', { name: expectations.it })).toBeVisible();
  await expect(page.locator('.exam-card__link[href="/it/udito/"]')).toBeVisible();

  for (const [locale, heading] of Object.entries(expectations)) {
    await page.locator('[data-locale-select]').selectOption(locale);
    await expect(page).toHaveURL(new RegExp(`/${locale}/$`));
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
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
  const titles = {
    en: 'Privacy at Sense6',
    it: 'Privacy su Sense6',
    de: 'Datenschutz bei Sense6',
    fr: 'Confidentialité chez Sense6',
    es: 'Privacidad en Sense6',
    pt: 'Privacidade na Sense6',
  };

  await page.goto('/en/');
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/privacy\/$/);
  await expect(page.getByRole('heading', { level: 1, name: titles.en })).toBeVisible();
  await expect(page.getByRole('link', { name: 'privacy@sense6.net' })).toHaveCount(2);
  await expect(page.getByText(/UTC day, test name, event name, and total count/i)).toBeVisible();
  await expect(page.getByText(/does not store IP addresses, identifiers, fingerprints/i)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  for (const [locale, title] of Object.entries(titles)) {
    await page.goto(`/${locale}/privacy/`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('link', { name: 'privacy@sense6.net' })).toHaveCount(2);
  }
});

test('language and theme controls do not overlap at narrow header widths', async ({ page }) => {
  for (const width of [320, 375, 640, 641, 700]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/en/');
    await page.locator('[data-locale-select]').selectOption('pt');
    await expect(page).toHaveURL(/\/pt\/$/);
    await expectInVisualViewport(page.locator('.brand'), `brand at ${width}px`, {
      clearOfChrome: false,
      hitTest: true,
    });
    await expectInVisualViewport(page.locator('[data-locale-select]'), `language selector at ${width}px`, {
      clearOfChrome: false,
      hitTest: true,
    });
    await expectInVisualViewport(page.locator('[data-bronto-theme-toggle]'), `theme control at ${width}px`, {
      clearOfChrome: false,
      hitTest: true,
    });

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
        localeRight: locale.right,
        labelFits: labelWidth <= labelSpace,
        themeLeft: theme.left,
        viewportWidth: document.documentElement.clientWidth,
        contentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.localeRight, `language selector overlaps theme button at ${width}px`).toBeLessThanOrEqual(
      geometry.themeLeft,
    );
    expect(geometry.labelFits, `language label is clipped at ${width}px`).toBe(true);
    expect(geometry.contentWidth, `header overflows horizontally at ${width}px`).toBeLessThanOrEqual(
      geometry.viewportWidth,
    );
  }
});

test('every live exam has a localized European-language entry point', async ({ page }) => {
  const headings = {
    it: {
      tetracromia: 'Quanto finemente',
      'color-blindness': 'Trova l’apertura',
      riflessi: 'Nota il segnale',
      udito: 'Ascolta il limite',
      acutezza: 'Calibra lo schermo',
    },
    de: {
      tetracromia: 'Wie fein',
      'color-blindness': 'Finden Sie die Lücke',
      riflessi: 'Signal erkennen',
      udito: 'Hören Sie auf die Grenze',
      acutezza: 'Kalibrieren Sie den Bildschirm',
    },
    fr: {
      tetracromia: 'Avec quelle finesse',
      'color-blindness': 'Repérez l’ouverture',
      riflessi: 'Repérez le signal',
      udito: 'Écoutez la limite',
      acutezza: 'Étalonnez l’écran',
    },
    es: {
      tetracromia: '¿Con qué precisión',
      'color-blindness': 'Encuentra la abertura',
      riflessi: 'Detecta la señal',
      udito: 'Escucha el límite',
      acutezza: 'Calibra la pantalla',
    },
    pt: {
      tetracromia: 'Com que precisão',
      'color-blindness': 'Encontre a abertura',
      riflessi: 'Detete o sinal',
      udito: 'Escute o limite',
      acutezza: 'Calibre o ecrã',
    },
  };

  for (const [locale, routes] of Object.entries(headings)) {
    for (const [route, heading] of Object.entries(routes)) {
      await page.goto(`/${locale}/${route}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('main h1')).toContainText(heading, { ignoreCase: true });
      await expect(page.locator('[data-locale-select]')).toHaveValue(locale);
    }
  }

  await page.goto('/en/udito/');
  await page.locator('[data-locale-select]').selectOption('es');
  await expect(page).toHaveURL(/\/es\/udito\/$/);
  await expect(page.locator('main h1')).toContainText('Escucha el límite', { ignoreCase: true });
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
});

test('long German labels remain inside the mobile viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only localization geometry check');
  await page.goto('/de/');
  await expectNoHorizontalOverflow(page, 'German gallery');
  await expectInVisualViewport(page.locator('.gallery-hero h1'), 'German gallery heading');

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

test('the shared shell reflows at 200% text size without hidden controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only text reflow check');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/de/');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });

  await expectNoHorizontalOverflow(page, '200% text gallery');
  await expectInVisualViewport(page.locator('.brand'), '200% text brand', {
    clearOfChrome: false,
    hitTest: true,
  });
  await expectInVisualViewport(page.locator('[data-locale-select]'), '200% text language selector', {
    clearOfChrome: false,
    hitTest: true,
  });
  await expectInVisualViewport(page.locator('[data-bronto-theme-toggle]'), '200% text theme control', {
    clearOfChrome: false,
    hitTest: true,
  });
});
