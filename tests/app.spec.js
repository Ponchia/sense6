import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { aboutCopy } from '../src/about.js';
import { examDescriptionSource } from '../src/exams/metadata.js';
import { EXAMS } from '../src/exams/registry.js';
import { LANDING_COPY_SOURCES, SETUP_COPY_SOURCES } from '../src/locales/landing-copy.js';
import { LOCALES, loadMessages } from '../src/locales.js';
import { preparePrivacyCopy, privacyCopy } from '../src/privacy.js';
import { expectInVisualViewport, expectNoHorizontalOverflow } from './helpers/browser.js';

test('the gallery lists exams, is accessible, and routes into one @pr-smoke', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await expect(page.locator('.brand')).toHaveText('Sense6');
  await expect(page.locator('.brand')).not.toContainText('Perception lab');
  await expect(page.locator('.sense-mark')).toHaveText('Sense6');
  await expect(page.locator('.sense-mark__signal')).toHaveCount(6);
  await expect(page.locator('.ui-sitefooter__links > span')).toHaveCount(0);
  await expect(page.locator('.ui-sitefooter__links > a')).toHaveCount(5);
  await expect(page.locator('.gallery-hero__boundary')).toHaveText(
    'Experimental perception tests for curiosity and fun—not medical tests or diagnoses.',
  );
  await expect(page.locator('.gallery-hero__lede')).toContainText(
    'No account, no answers or results uploaded.',
  );
  await expect(page.getByText(/diagnosis theatre/i)).toHaveCount(0);
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
  await expect(page.locator('.gallery-proof, .principles')).toHaveCount(0);
  const allTestsAction = page.locator('.gallery-hero__actions').getByRole('link', { name: 'All tests' });
  await expect(allTestsAction).toHaveAttribute('href', '#tests');
  await expectInVisualViewport(allTestsAction, 'gallery test-discovery action', { hitTest: true });
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

test('Learn remains reachable throughout English navigation without false translated routes @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/riflessi/');
  const englishLearn = page.locator('.ui-sitefooter__links [data-sense6-english-only]');
  await expect(englishLearn).toHaveText('Learn');
  await expect(englishLearn).toHaveAttribute('href', '/en/learn/');
  await expect(englishLearn).toBeVisible();
  await englishLearn.click();
  await expect(page).toHaveURL(/\/en\/learn\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Perception, explained.');
  await page.locator('[data-locale-select]').selectOption('it');
  await expect(page).toHaveURL(/\/it\/$/);
  await expect(englishLearn).toBeHidden();
  await expect(englishLearn).toHaveAttribute('href', '/it/');
  await page.reload();
  await expect(englishLearn).toBeHidden();
  await expect(englishLearn).toHaveAttribute('href', '/it/');
  await page.locator('[data-locale-select]').selectOption('en');
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(englishLearn).toBeVisible();
  await expect(page.locator('.gallery-hero__learn')).toHaveAttribute('href', '/en/learn/');
  await page.locator('.gallery-hero__learn').click();
  await expect(page).toHaveURL(/\/en\/learn\/$/);
});

test('the featured starter opens the short Riflessi setup without bypassing consent @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/');
  const starter = page.locator('[data-sense6-starter="riflessi-signal"]');
  await expect(starter).toHaveAttribute('href', '/en/riflessi/?scope=signal');
  await expect(starter).toHaveText(/Try a short reaction test/i);
  await starter.click();
  await expect(page).toHaveURL(/\/en\/riflessi\/\?scope=signal$/);
  await expect(page.locator('[data-rx-scope-picker] [data-scope="signal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-rx-scope-picker] [data-scope="complete"]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.locator('[data-rx-consent]')).not.toBeChecked();
  await expect(page.locator('[data-action="rx-start"]')).toBeDisabled();
  await expect(page.locator('.rx-runner')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/en/riflessi/',
  );

  await page.goto('/en/riflessi/');
  await expect(page.getByRole('button', { name: /Prepare the lab/i })).toBeVisible();
  await expect(page.locator('[data-rx-scope-picker]')).toHaveCount(0);

  await page.goto('/it/');
  await expect(page.locator('[data-sense6-starter="riflessi-signal"]')).toHaveAttribute(
    'href',
    '/it/riflessi/?scope=signal',
  );
  await page.locator('[data-sense6-starter="riflessi-signal"]').click();
  await expect(page).toHaveURL(/\/it\/riflessi\/\?scope=signal$/);
  await expect(page.locator('[data-rx-scope-picker] [data-scope="signal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-rx-consent]')).not.toBeChecked();
});

test('the first experiment action is visible without scrolling at common widths @pr-smoke', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/en/');
    await page.evaluate(async () => document.fonts.ready);
    const starter = page.locator('[data-sense6-starter="riflessi-signal"]');
    await expect(starter).toBeVisible();
    const box = await starter.boundingBox();
    expect(box).not.toBeNull();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }
});

test('the root remains a self-canonical language gateway after JavaScript starts', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle('Sense6 — choose your language');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sense6.net/');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://sense6.net/');
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'language');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.static-language-list a')).toHaveCount(LOCALES.length);

  await page.locator('[data-locale-select]').selectOption('fr');
  await expect(page).toHaveURL(/\/fr\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('SPA navigation commits complete canonical and social metadata for each active route @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/');
  await expectRouteMetadata(page, {
    title: 'Sense6 — measure what your senses notice',
    description:
      'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.',
    path: '/en/',
    image: '/social/sense6.png',
    imageAlt:
      'Private browser tests for colour, response timing, and hearing. Answers and results stay in your browser.',
  });

  await page.getByRole('link', { name: 'About' }).click();
  const about = aboutCopy('en');
  await expectRouteMetadata(page, {
    title: about.pageTitle,
    description: about.description,
    path: '/en/about/',
    image: '/social/sense6.png',
  });

  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  const privacy = privacyCopy('en');
  await expectRouteMetadata(page, {
    title: `${privacy.title} | Sense6`,
    description: privacy.intro,
    path: '/en/privacy/',
    image: '/social/sense6.png',
    indexable: false,
  });

  await page.locator('.brand').click();
  const acutezza = EXAMS.find(({ id }) => id === 'acutezza');
  await page.locator('.exam-card__link[href="/en/acutezza/"]').click();
  await expectRouteMetadata(page, {
    title: acutezza.pageTitle,
    description: examDescriptionSource(acutezza, 'en'),
    path: '/en/acutezza/',
    image: '/social/acutezza.png',
    // The identity alone. Concatenating the tagline produced three descriptors
    // in one alt string, and the static build must agree with this exactly.
    imageAlt: acutezza.discoveryName ?? acutezza.name,
  });
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

async function expectRouteMetadata(
  page,
  { title, description, path, image, imageAlt = description, indexable = true },
) {
  const canonical = `https://sense6.net${path}`;
  await expect(page).toHaveTitle(title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    `https://sense6.net${image}`,
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', imageAlt);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', title);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', description);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    `https://sense6.net${image}`,
  );
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute('content', imageAlt);
  if (indexable) {
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  } else {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  }
}

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
    await expect(page.locator('.gallery-hero__boundary')).toHaveText(
      messages.get('Experimental perception tests for curiosity and fun—not medical tests or diagnoses.'),
    );
    await expect(page.locator('.gallery-hero__lede')).toContainText(
      messages.get('No account, no answers or results uploaded.'),
    );
  }

  await page.locator('[data-locale-select]').selectOption('de');
  await page.reload();
  await expect(page.locator('[data-locale-select]')).toHaveValue('de');
  await page.locator('.exam-card__link[href="/de/udito/"]').click();
  await expect(page.getByRole('heading', { name: /Hören Sie auf die Grenze/i })).toBeVisible();
  await expect(page).toHaveTitle(/Gerätebezogenes Hörlabor/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('persistent shell copy keeps stable sources across de to it', async ({ page }) => {
  const italian = await loadMessages('it');
  await page.goto('/de/');
  await page.locator('[data-locale-select]').selectOption('it');

  await expect(page).toHaveURL(/\/it\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('[data-locale-select]')).toHaveValue('it');
  await expect(page.locator('.ui-skiplink')).toHaveText(italian.get('Skip to content'));
  await expect(page.locator('.theme-button__label')).toHaveText(italian.get('Theme'));
  await expect(page.locator('[data-bronto-theme-toggle]')).toHaveAttribute(
    'aria-label',
    italian.get('Toggle light and dark theme'),
  );
  await expect(page.locator('.ui-sitefooter__links [data-sense6-route="about"]')).toHaveText(
    italian.get('About'),
  );
  await expect(
    page.getByRole('heading', { name: italian.get('Start with what you want to learn.') }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sense6:locale'))).toBe('it');

  const gamutSource = await page.locator('#gamut-chip').getAttribute('data-i18n-source');
  await expect(page.locator('#gamut-chip')).toHaveText(italian.get(gamutSource));
});

test('an initial catalog failure hydrates the source-language app with a retry path', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let attempts = 0;
  await page.route(/\/(?:assets\/de-[^/]+|src\/locales\/de)\.js(?:\?.*)?$/, (route) => {
    attempts += 1;
    if (attempts === 1) return route.abort('failed');
    return route.continue();
  });

  await page.goto('/de/');
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'gallery');
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('[data-locale-select]')).toHaveValue('en');
  await expect(page.locator('[data-locale-retry]')).toHaveAttribute('href', '/de/');

  await page.locator('[data-locale-select]').selectOption('de');
  await expect(page).toHaveURL(/\/de\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('[data-locale-select]')).toHaveValue('de');
  await expect(page.locator('[data-locale-retry]')).toHaveCount(0);
  expect(attempts).toBe(2);
  expect(pageErrors).toEqual([]);
});

test('a failed locale switch preserves every committed locale state', async ({ page }) => {
  const italian = await loadMessages('it');
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route(/\/(?:assets\/de-[^/]+|src\/locales\/de)\.js(?:\?.*)?$/, (route) => route.abort('failed'));

  await page.goto('/it/');
  await page.locator('[data-locale-select]').selectOption('de');

  await expect
    .poll(() =>
      page.evaluate(() => ({
        direction: document.documentElement.dir,
        heading: document.querySelector('.gallery-heading h2')?.textContent?.trim(),
        language: document.documentElement.lang,
        pathname: window.location.pathname,
        selected: document.querySelector('[data-locale-select]')?.value,
        shell: document.querySelector('.theme-button__label')?.textContent?.trim(),
        stored: localStorage.getItem('sense6:locale'),
      })),
    )
    .toEqual({
      direction: 'ltr',
      heading: italian.get('Start with what you want to learn.'),
      language: 'it',
      pathname: '/it/',
      selected: 'it',
      shell: italian.get('Theme'),
      stored: null,
    });
  expect(pageErrors).toEqual([]);
});

test('a delayed it locale chunk cannot overwrite a later de selection', async ({ page }) => {
  const german = await loadMessages('de');
  let releaseItalian;
  let markItalianRequested;
  let markItalianSettled;
  const italianGate = new Promise((resolve) => {
    releaseItalian = resolve;
  });
  const italianRequested = new Promise((resolve) => {
    markItalianRequested = resolve;
  });
  const italianSettled = new Promise((resolve) => {
    markItalianSettled = resolve;
  });
  await page.route(/\/(?:assets\/it-[^/]+|src\/locales\/it)\.js(?:\?.*)?$/, async (route) => {
    markItalianRequested();
    await italianGate;
    const response = await route.fetch();
    await route.fulfill({ response });
    markItalianSettled();
  });

  await page.goto('/en/');
  await page.locator('[data-locale-select]').selectOption('it');
  await italianRequested;
  await page.locator('[data-locale-select]').selectOption('de');
  await expect(page).toHaveURL(/\/de\/$/);
  releaseItalian();
  await italianSettled;

  await expect
    .poll(() =>
      page.evaluate(() => ({
        direction: document.documentElement.dir,
        heading: document.querySelector('.gallery-heading h2')?.textContent?.trim(),
        language: document.documentElement.lang,
        pathname: window.location.pathname,
        selected: document.querySelector('[data-locale-select]')?.value,
        shell: document.querySelector('.theme-button__label')?.textContent?.trim(),
        stored: localStorage.getItem('sense6:locale'),
      })),
    )
    .toEqual({
      direction: 'ltr',
      heading: german.get('Start with what you want to learn.'),
      language: 'de',
      pathname: '/de/',
      selected: 'de',
      shell: german.get('Theme'),
      stored: 'de',
    });
});

test('a stale catalog failure cannot roll back a later successful selection', async ({ page }) => {
  const german = await loadMessages('de');
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let releaseItalian;
  let markItalianRequested;
  let markItalianSettled;
  const italianGate = new Promise((resolve) => {
    releaseItalian = resolve;
  });
  const italianRequested = new Promise((resolve) => {
    markItalianRequested = resolve;
  });
  const italianSettled = new Promise((resolve) => {
    markItalianSettled = resolve;
  });
  await page.route(/\/(?:assets\/it-[^/]+|src\/locales\/it)\.js(?:\?.*)?$/, async (route) => {
    markItalianRequested();
    await italianGate;
    await route.abort('failed');
    markItalianSettled();
  });

  await page.goto('/en/');
  await page.locator('[data-locale-select]').selectOption('it');
  await italianRequested;
  await page.locator('[data-locale-select]').selectOption('de');
  await expect(page).toHaveURL(/\/de\/$/);
  releaseItalian();
  await italianSettled;

  await expect
    .poll(() =>
      page.evaluate(() => ({
        direction: document.documentElement.dir,
        heading: document.querySelector('.gallery-heading h2')?.textContent?.trim(),
        language: document.documentElement.lang,
        pathname: window.location.pathname,
        selected: document.querySelector('[data-locale-select]')?.value,
        shell: document.querySelector('.theme-button__label')?.textContent?.trim(),
        stored: localStorage.getItem('sense6:locale'),
      })),
    )
    .toEqual({
      direction: 'ltr',
      heading: german.get('Start with what you want to learn.'),
      language: 'de',
      pathname: '/de/',
      selected: 'de',
      shell: german.get('Theme'),
      stored: 'de',
    });
  expect(pageErrors).toEqual([]);
});

test('the privacy notice describes the deployed data boundary in every locale', async ({ page }) => {
  await page.goto('/en/');
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/privacy\/$/);
  await expect(page.getByRole('heading', { level: 1, name: privacyCopy('en').title })).toBeVisible();
  await expect(page.getByRole('link', { name: 'privacy@sense6.net' })).toHaveCount(2);
  await expect(page.locator('.privacy-vault__device i')).toHaveCount(9);
  await expect(page.locator('.privacy-boundary')).toBeVisible();
  await expect(page.getByText(/UTC day, test name, event name, and total count/i)).toBeVisible();
  await expect(page.getByText(/does not store IP addresses, identifiers, fingerprints/i)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  for (const { code, languageTag, direction } of LOCALES) {
    await preparePrivacyCopy(code);
    await page.goto(`/${code}/privacy/`);
    await expect(page.locator('html')).toHaveAttribute('lang', languageTag);
    await expect(page.locator('html')).toHaveAttribute('dir', direction);
    await expect(page.getByRole('heading', { level: 1, name: privacyCopy(code).title })).toBeVisible();
    await expect(page.getByRole('link', { name: 'privacy@sense6.net' })).toHaveCount(2);
  }
});

test('the About page explains authorship, methodology, and permanent limits in every locale', async ({
  page,
}) => {
  await page.goto('/en/');
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/about\/$/);
  await expect(page.getByRole('heading', { level: 1, name: aboutCopy('en').title })).toBeVisible();
  await expect(page.getByText('No certification or formal validation is planned.')).toBeVisible();
  await expect(page.getByText(/created and maintained by Zeno\./)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zeno', exact: true })).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Zeno', exact: true }).first()).toHaveAttribute(
    'href',
    'https://github.com/Ponchia',
  );
  await expect(page.getByRole('link', { name: 'privacy@sense6.net', exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'privacy notice', exact: true })).toBeVisible();
  await expect(page.locator('.about-orbit i')).toHaveCount(6);
  await expect(page.locator('.about-signal > span')).toHaveCount(5);
  await expect(page.locator('.about-experiment')).toHaveCount(5);
  await expect(page.locator('.about-experiment__signal')).toHaveCount(5);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  for (const { code, languageTag, direction } of LOCALES) {
    await page.goto(`/${code}/about/`);
    await expect(page.locator('html')).toHaveAttribute('lang', languageTag);
    await expect(page.locator('html')).toHaveAttribute('dir', direction);
    await expect(page.getByRole('heading', { level: 1, name: aboutCopy(code).title })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      )
      .toBe(true);
  }
});

test('language and theme controls do not overlap at narrow header widths', async ({ page }) => {
  test.setTimeout(90_000);
  for (const width of [320, 375, 640, 641, 700]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/en/');
    const locales = width <= 640 ? LOCALES : LOCALES.filter(({ code }) => code === 'pt');
    for (const { code } of locales) {
      await page.locator('[data-locale-select]').selectOption(code);
      await expect(page).toHaveURL(new RegExp(`/${code}/$`));
      await expectInVisualViewport(page.locator('.brand'), `${code} brand at ${width}px`, {
        clearOfChrome: false,
        hitTest: true,
      });
      await expectInVisualViewport(
        page.locator('[data-locale-select]'),
        `${code} language selector at ${width}px`,
        {
          clearOfChrome: false,
          hitTest: true,
        },
      );
      await expectInVisualViewport(
        page.locator('[data-bronto-theme-toggle]'),
        `${code} theme control at ${width}px`,
        {
          clearOfChrome: false,
          hitTest: true,
        },
      );

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
    tetracromia: ['Notice colour in', 'three different ways'],
    'color-blindness': ['Find the gap', 'in the dots'],
    riflessi: ['Notice the signal.', 'Measure the response.'],
    udito: ['Listen for the boundary.', 'Keep the limits audible.'],
    acutezza: ['Calibrate the screen.', 'Resolve the opening.'],
  };
  const setupActions = {
    tetracromia: '[data-action="setup"]',
    'color-blindness': '[data-action="cb-setup"]',
    riflessi: '[data-action="rx-setup"]',
    udito: '[data-action="au-setup"]',
    acutezza: '[data-action="ac-prepare"]',
  };
  const setupAttributeSources = {
    tetracromia: ['Eleven brightness steps from black to white', 'Continuous grayscale gradient'],
  };
  for (const { code, languageTag } of LOCALES) {
    const messages = await loadMessages(code);
    for (const { route } of EXAMS) {
      await page.goto(`/${code}/${route}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', languageTag);
      const expected = headingSources[route].map((source) => escapeRegex(messages.get(source))).join('\\s*');
      const prefix = route === 'tetracromia' ? 'Tetracromia\\s+—\\s+' : '';
      const suffix = ['tetracromia', 'color-blindness'].includes(route) ? '\\.' : '';
      await expect(page.locator('main h1')).toHaveText(new RegExp(`^${prefix}${expected}${suffix}$`, 'u'));
      await expect(page.locator('[data-locale-select]')).toHaveValue(code);

      const rendered = await renderedTextNodes(page);
      const landingSources = LANDING_COPY_SOURCES[route];
      const expectedLanding = landingSources.map((source) => messages.get(source));
      expect(rendered, `${code}/${route} should render every localized landing phrase`).toEqual(
        expect.arrayContaining(expectedLanding),
      );
      if (code !== 'en') {
        const leaked = landingSources.filter(
          (source) => messages.get(source) !== source && rendered.includes(source),
        );
        expect(leaked, `${code}/${route} should not retain English landing phrases`).toEqual([]);
      }

      const setupSources = SETUP_COPY_SOURCES[route];
      if (setupSources.length) {
        await page.locator(setupActions[route]).first().click();
        const renderedSetup = await renderedTextNodes(page);
        const attributeSources = setupAttributeSources[route] ?? [];
        const visibleSources = setupSources.filter((source) => !attributeSources.includes(source));
        const expectedSetup = visibleSources.map((source) => messages.get(source));
        expect(renderedSetup, `${code}/${route} should render every localized setup phrase`).toEqual(
          expect.arrayContaining(expectedSetup),
        );
        const renderedAttributes = await page
          .locator('[aria-label], [placeholder], [title]')
          .evaluateAll((elements) =>
            elements.flatMap((element) =>
              ['aria-label', 'placeholder', 'title']
                .map((attribute) => element.getAttribute(attribute))
                .filter(Boolean),
            ),
          );
        expect(renderedAttributes, `${code}/${route} should localize setup attributes`).toEqual(
          expect.arrayContaining(attributeSources.map((source) => messages.get(source))),
        );
        if (code !== 'en') {
          const leaked = visibleSources.filter(
            (source) => messages.get(source) !== source && renderedSetup.includes(source),
          );
          expect(leaked, `${code}/${route} setup should not retain English phrases`).toEqual([]);
          const leakedAttributes = attributeSources.filter(
            (source) => messages.get(source) !== source && renderedAttributes.includes(source),
          );
          expect(
            leakedAttributes,
            `${code}/${route} setup attributes should not retain English phrases`,
          ).toEqual([]);
        }
      }
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

test('the root gateway does not rewrite its canonical for the browser language', async ({ browser }) => {
  const port = process.env.PLAYWRIGHT_PORT ?? '4173';
  const context = await browser.newContext({
    locale: 'fr-FR',
    baseURL: `http://127.0.0.1:${port}`,
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sense6.net/');
  await expect(page.locator('.static-language-list a[hreflang="fr"]')).toHaveAttribute('href', '/fr/');
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function renderedTextNodes(page) {
  return page.locator('body').evaluate((body) => {
    const values = [];
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const value = node.data.replace(/\s+/g, ' ').trim();
      if (value) values.push(value);
      node = walker.nextNode();
    }
    return [...new Set(values)];
  });
}
