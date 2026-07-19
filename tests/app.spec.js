import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const QUICK_RIFLESSI = {
  riflessi: {
    anticipationMs: 0,
    feedbackMs: 8,
    signal: {
      practiceTrials: 1,
      scoredTrials: 2,
      catchTrials: 0,
      minWaitMs: 12,
      maxWaitMs: 18,
      responseTimeoutMs: 500,
    },
    choice: {
      practiceTrials: 2,
      scoredTrials: 4,
      minWaitMs: 12,
      maxWaitMs: 18,
      responseTimeoutMs: 500,
    },
    stability: {
      durationMs: 550,
      minWaitMs: 12,
      maxWaitMs: 18,
      responseTimeoutMs: 300,
    },
  },
};

const QUICK_UDITO = {
  udito: {
    feedbackMs: 2,
    audio: { toneMs: 8, gapMs: 4, rampMs: 1, referenceMs: 18 },
    headphones: { practiceTrials: 1, scoredTrials: 2, passCorrect: 2 },
    range: { targetReversals: 0, minTrials: 2, maxTrials: 2, controlAt: [] },
    pitch: { targetReversals: 0, minTrials: 2, maxTrials: 2 },
  },
};

async function installQuickRiflessi(page) {
  await page.addInitScript((configuration) => {
    window.__SENSE6_TEST_CONFIG__ = configuration;
  }, QUICK_RIFLESSI);
}

async function installQuickUdito(page) {
  await page.addInitScript((configuration) => {
    window.__SENSE6_TEST_CONFIG__ = configuration;
  }, QUICK_UDITO);
}

async function answerCurrentSoundTrial(page) {
  const runner = page.locator('[data-au-runner]');
  const firstResponse = page.locator('[data-au-response="0"]');
  await expect(firstResponse).toBeEnabled();
  const correct = await runner.getAttribute('data-correct-interval');
  await page.locator(`[data-au-response="${correct}"]`).click();
}

async function respondWithKey(page, key) {
  const chamber = page.locator('[data-rx-chamber]');
  await expect(chamber).toHaveAttribute('data-rx-state', 'live');
  await page.keyboard.press(key);
}

async function respondToChoice(page) {
  const chamber = page.locator('[data-rx-chamber]');
  await expect(chamber).toHaveAttribute('data-rx-state', 'live');
  const side = await page.locator('[data-rx-arrow]').getAttribute('data-side');
  await page.keyboard.press(side === 'left' ? 'ArrowLeft' : 'ArrowRight');
}

test('the gallery lists exams, is accessible, and routes into one', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await expect(page.locator('.exam-card__link[href="#/en/tetracromia"]')).toBeVisible();
  await expect(page.locator('.exam-card__link[href="#/en/color-blindness"]')).toBeVisible();
  await expect(page.locator('.exam-card__link[href="#/en/riflessi"]')).toBeVisible();
  await expect(page.locator('.exam-card__link[href="#/en/udito"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: /More senses, same standard/i })).toBeVisible();
  await expect(page.locator('.roadmap-item')).toHaveCount(1);
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

  await page.locator('.exam-card__link[href="#/en/color-blindness"]').click();
  await expect(page).toHaveURL(/#\/en\/color-blindness$/);
  await expect(page.getByRole('heading', { name: /Find the gap in the dots/i })).toBeVisible();
});

test('language routes translate, persist, and remain accessible', async ({ page }) => {
  const expectations = {
    it: 'Inizia da ciò che vuoi scoprire.',
    de: 'Beginnen Sie mit dem, was Sie erfahren möchten.',
    fr: 'Commencez par ce que vous souhaitez découvrir.',
    es: 'Empieza por lo que quieres descubrir.',
    pt: 'Comece pelo que deseja descobrir.',
  };

  await page.goto('/#/it/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.getByRole('heading', { name: expectations.it })).toBeVisible();
  await expect(page.locator('.exam-card__link[href="#/it/udito"]')).toBeVisible();

  for (const [locale, heading] of Object.entries(expectations)) {
    await page.locator('[data-locale-select]').selectOption(locale);
    await expect(page).toHaveURL(new RegExp(`#/${locale}/$`));
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await page.locator('[data-locale-select]').selectOption('de');
  await page.reload();
  await expect(page.locator('[data-locale-select]')).toHaveValue('de');
  await page.locator('.exam-card__link[href="#/de/udito"]').click();
  await expect(page.getByRole('heading', { name: /Hören Sie auf die Grenze/i })).toBeVisible();
  await expect(page).toHaveTitle(/Gerätebezogenes Hörlabor/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('language and theme controls do not overlap at narrow header widths', async ({ page }) => {
  for (const width of [320, 375, 640, 641, 700]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/#/en/');

    const geometry = await page.evaluate(() => {
      const locale = document.querySelector('[data-locale-select]').getBoundingClientRect();
      const theme = document.querySelector('[data-bronto-theme-toggle]').getBoundingClientRect();
      return {
        localeRight: locale.right,
        themeLeft: theme.left,
        viewportWidth: document.documentElement.clientWidth,
        contentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.localeRight, `language selector overlaps theme button at ${width}px`).toBeLessThanOrEqual(
      geometry.themeLeft,
    );
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
    },
    de: {
      tetracromia: 'Wie fein',
      'color-blindness': 'Finden Sie die Lücke',
      riflessi: 'Signal erkennen',
      udito: 'Hören Sie auf die Grenze',
    },
    fr: {
      tetracromia: 'Avec quelle finesse',
      'color-blindness': 'Repérez l’ouverture',
      riflessi: 'Repérez le signal',
      udito: 'Écoutez la limite',
    },
    es: {
      tetracromia: '¿Con qué precisión',
      'color-blindness': 'Encuentra la abertura',
      riflessi: 'Detecta la señal',
      udito: 'Escucha el límite',
    },
    pt: {
      tetracromia: 'Com que precisão',
      'color-blindness': 'Encontre a abertura',
      riflessi: 'Detete o sinal',
      udito: 'Escute o limite',
    },
  };

  for (const [locale, routes] of Object.entries(headings)) {
    for (const [route, heading] of Object.entries(routes)) {
      await page.goto(`/#/${locale}/${route}`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('main h1')).toContainText(heading, { ignoreCase: true });
      await expect(page.locator('[data-locale-select]')).toHaveValue(locale);
    }
  }

  await page.goto('/#/en/udito');
  await page.locator('[data-locale-select]').selectOption('es');
  await expect(page).toHaveURL(/#\/es\/udito$/);
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
  await expect(page).toHaveURL(/#\/fr\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(
    page.getByRole('heading', { name: /Commencez par ce que vous souhaitez découvrir/i }),
  ).toBeVisible();
  await context.close();
});

test('long German labels remain inside the mobile viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only localization geometry check');
  await page.goto('/#/de/udito');
  await page.getByRole('button', { name: /Hörlabor vorbereiten/i }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
});

test('Udito completes three safe-listening instruments and keeps results separate', async ({ page }) => {
  await installQuickUdito(page);
  await page.goto('/#/udito');
  await expect(page).toHaveURL(/#\/en\/udito$/);

  await expect(page.getByRole('heading', { name: /Listen for the boundary/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Udito/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  await page.getByRole('button', { name: /See the method/i }).click();
  await expect(page.getByRole('heading', { name: /Three questions. No synthetic score/i })).toBeInViewport();

  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const start = page.getByRole('button', { name: /Begin instrument 01/i });
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: /Play quiet reference/i }).click();
  await expect(page.getByText(/Reference played/i)).toBeVisible();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  await expect(start).toBeEnabled();
  await start.click();

  await expect(page.getByRole('heading', { name: /Which tone is quietest/i })).toBeVisible();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Begin headphone check/i }).click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);

  await page.getByRole('button', { name: /Continue to Portata/i }).click();
  await page.getByRole('button', { name: /Start Portata/i }).click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);

  await page.getByRole('button', { name: /Continue to Intonazione/i }).click();
  await page.getByRole('button', { name: /Start Intonazione/i }).click();
  for (let trial = 0; trial < 4; trial += 1) await answerCurrentSoundTrial(page);

  await expect(page.getByRole('heading', { name: /Three listening measures/i })).toBeVisible();
  await expect(page.locator('.au-metric')).toHaveCount(4);
  await expect(page.getByText(/Device-relative, never dB HL/i)).toBeVisible();
  await expect(page.getByText(/hearing age/i)).toBeVisible();
  await expect(page.getByText(/composite hearing score/i)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the mobile Udito setup and listening runner stay inside the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await installQuickUdito(page);
  await page.goto('/#/udito');
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await page.getByRole('button', { name: /Play quiet reference/i }).click();
  await expect(page.getByText(/Reference played/i)).toBeVisible();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  await page.getByRole('button', { name: /Begin instrument 01/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();

  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
  await answerCurrentSoundTrial(page);
});

test('Riflessi completes all three instruments and reports separate device-relative measures', async ({
  page,
}) => {
  await installQuickRiflessi(page);
  await page.goto('/#/riflessi');

  await expect(page.getByRole('heading', { name: /Notice the signal/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Riflessi/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: /See the method/i }).click();
  await expect(page.getByRole('heading', { name: /Three questions, kept separate/i })).toBeInViewport();
  await expect(page).toHaveURL(/#\/en\/riflessi$/);

  await page.getByRole('button', { name: /Prepare the lab/i }).click();
  await page.getByRole('button', { name: /^Keyboard/i }).click();
  const start = page.getByRole('button', { name: /Begin instrument 01/i });
  await expect(start).toBeDisabled();
  await page.getByLabel(/I understand this measures this browser/i).check();
  await expect(start).toBeEnabled();
  await start.click();

  await expect(page.getByRole('heading', { name: /One signal. One action/i })).toBeVisible();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await respondWithKey(page, 'Space');
  await page.getByRole('button', { name: /Begin measured block/i }).click();
  await respondWithKey(page, 'Space');
  await respondWithKey(page, 'Space');

  await page.getByRole('button', { name: /Continue to Scelta/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await respondToChoice(page);
  await respondToChoice(page);
  await page.getByRole('button', { name: /Begin measured block/i }).click();
  for (let trial = 0; trial < 4; trial += 1) await respondToChoice(page);

  await page.getByRole('button', { name: /Continue to Tenuta/i }).click();
  await page.getByRole('button', { name: /Start the 3-minute run/i }).click();
  await respondWithKey(page, 'Space');

  await expect(page.getByRole('heading', { name: /more than one dimension/i })).toBeVisible();
  await expect(page.locator('.rx-metric')).toHaveCount(6);
  await expect(page.getByText(/Compare conditions, not people/i)).toBeVisible();
  await expect(page.getByText(/population percentile/i)).toBeVisible();
  await expect(page.getByText(/brain age/i)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the mobile Riflessi setup and response chamber stay inside the viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await installQuickRiflessi(page);
  await page.goto('/#/riflessi');
  await page.getByRole('button', { name: /Prepare the lab/i }).click();
  await page.getByRole('button', { name: /^Touch \/ pointer/i }).click();
  await page.getByLabel(/I understand this measures this browser/i).check();
  await page.getByRole('button', { name: /Begin instrument 01/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-rx-chamber]')).toHaveAttribute('data-rx-state', 'live');

  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
  await page.getByRole('button', { name: /Respond to signal/i }).click();
});

test('landing page presents the method and passes an accessibility scan', async ({ page }) => {
  await page.goto('/#/tetracromia');

  await expect(page.getByRole('heading', { name: /How finely do you see color/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Begin the color lab/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /An RGB screen cannot test tetrachromacy/i })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // The inverted method section must re-anchor heading and step-title colors;
  // base styles pin them to var(--text), which disappears on the dark panel.
  const methodContrast = await page.evaluate(() => {
    const section = document.querySelector('.method');
    const targets = [section.querySelector('h2'), section.querySelector('.method-steps strong')];
    const sectionBackground = getComputedStyle(section).backgroundColor;
    return targets.map((element) => ({
      color: getComputedStyle(element).color,
      background: sectionBackground,
    }));
  });
  for (const { color, background } of methodContrast) {
    expect(color).not.toEqual(background);
  }
});

test('screen setup gates the adaptive lab and advances into the field instrument', async ({ page }) => {
  await page.goto('/#/tetracromia');
  await page.getByRole('button', { name: /Begin the color lab/i }).click();

  const start = page.getByRole('button', { name: /Start instrument 01/i });
  await expect(start).toBeDisabled();
  await page.getByLabel(/I can distinguish the steps/i).check();
  await expect(start).toBeEnabled();
  await start.click();

  await expect(page.getByRole('heading', { name: /Which tile is different/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Color tile 1', exact: true })).toBeVisible();

  for (let trial = 0; trial < 14; trial += 1) {
    await page.getByRole('button', { name: 'Color tile 1', exact: true }).click();
  }

  await expect(page.getByRole('heading', { name: /Which field shifts in color/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dotted field 1' })).toBeVisible();
});

test('a complete session produces an honest, accessible result profile', async ({ page }) => {
  await page.goto('/#/tetracromia');
  await page.getByRole('button', { name: /Begin the color lab/i }).click();
  await page.getByLabel(/I can distinguish the steps/i).check();
  await page.getByRole('button', { name: /Start instrument 01/i }).click();

  for (let trial = 0; trial < 14; trial += 1) {
    await page.getByRole('button', { name: 'Color tile 1', exact: true }).click();
  }
  for (let trial = 0; trial < 12; trial += 1) {
    await page.getByRole('button', { name: 'Dotted field 1', exact: true }).click();
  }

  // Sequence interactions must update the board in place — a full re-render
  // reads as the exercise resetting.
  await page.evaluate(() => {
    document.querySelector('#sequence-run').dataset.probe = 'kept';
  });
  const firstMovableTile = page.getByRole('button', { name: /Movable color tile 1 of 7/ });
  await firstMovableTile.click();
  await expect(firstMovableTile).toHaveAttribute('aria-pressed', 'true');
  await firstMovableTile.press('ArrowRight');
  expect(await page.evaluate(() => document.querySelector('#sequence-run').dataset.probe)).toBe('kept');

  for (let run = 0; run < 3; run += 1) {
    await page.getByRole('button', { name: /Lock this order/i }).click();
  }

  await expect(page.getByRole('heading', { name: /Your visible boundary, on this display/i })).toBeVisible();
  await expect(page.locator('.result-note')).toContainText('not a population percentile');
  await expect(page.getByRole('meter')).toHaveCount(3);
  await expect(page.locator('.profile-radar__point')).toHaveCount(7);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('pointer drag reorders tiles by insertion and tap-swap is one-shot', async ({ page }) => {
  await page.goto('/#/tetracromia');
  await page.getByRole('button', { name: /Begin the color lab/i }).click();
  await page.getByLabel(/I can distinguish the steps/i).check();
  await page.getByRole('button', { name: /Start instrument 01/i }).click();
  for (let trial = 0; trial < 14; trial += 1) {
    await page.getByRole('button', { name: 'Color tile 1', exact: true }).click();
  }
  for (let trial = 0; trial < 12; trial += 1) {
    await page.getByRole('button', { name: 'Dotted field 1', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: /Build the smoothest color path/i })).toBeVisible();
  // Let the staggered entrance animation settle before measuring geometry.
  await page.waitForTimeout(700);

  const colors = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.sequence-tile')].map((tile) =>
        tile.style.getPropertyValue('--tile-color'),
      ),
    );

  // Drag the first tile onto the fourth slot: insertion, not swap — the
  // in-between tiles shift left by one.
  const before = await colors();
  const source = page.locator('[data-sequence-index="0"]');
  const target = page.locator('[data-sequence-index="3"]');
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();

  const afterDrag = await colors();
  expect(afterDrag[3]).toBe(before[0]);
  expect(afterDrag.slice(0, 3)).toEqual(before.slice(1, 4));

  // Tap-swap: selecting two tiles swaps them once and clears the selection.
  await page.locator('[data-sequence-index="1"]').click();
  await expect(page.locator('[data-sequence-index="1"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-sequence-index="5"]').click();
  const afterSwap = await colors();
  expect(afterSwap[1]).toBe(afterDrag[5]);
  expect(afterSwap[5]).toBe(afterDrag[1]);
  await expect(page.locator('.sequence-tile.is-selected')).toHaveCount(0);
});

test('mobile layout stays inside the viewport through setup and the first trial', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await page.goto('/#/tetracromia');

  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);

  await page.getByRole('button', { name: /Begin the color lab/i }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);

  await page.getByLabel(/I can distinguish the steps/i).check();
  await page.getByRole('button', { name: /Start instrument 01/i }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
});

test('the Daltonia experiment renders adaptive targets and reports non-clinical thresholds', async ({
  page,
}) => {
  await page.goto('/#/color-blindness');
  await expect(page.getByRole('heading', { name: /Find the gap in the dots/i })).toBeVisible();
  await expect(page.getByText('Three staircases', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Daltonia/i })).toBeVisible();

  const methodColours = await page.evaluate(() => {
    const target = document.querySelector('.cb-steps strong');
    return {
      text: getComputedStyle(target).color,
      background: getComputedStyle(document.documentElement).backgroundColor,
    };
  });
  expect(methodColours.text).not.toEqual(methodColours.background);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole('button', { name: /Start the experiment/i }).click();
  const begin = page.getByRole('button', { name: /Start practice/i });
  await expect(begin).toBeDisabled();
  await page.getByLabel(/My colour filters are off and I understand/i).check();
  await expect(begin).toBeEnabled();
  await begin.click();

  // Practice gives corrective feedback rather than silently accepting a guess.
  await expect(page.getByRole('heading', { name: /Where is the clear gap/i })).toBeVisible();
  const practiceScan = await new AxeBuilder({ page }).analyze();
  expect(practiceScan.violations).toEqual([]);
  await page.getByRole('button', { name: /Gap at top/i }).click();
  await expect(page.getByText(/Try this target again/i)).toBeVisible();
  await page.getByRole('button', { name: /Gap at right/i }).click();
  await expect(page.getByText(/That is the gap/i)).toBeVisible();
  await page.keyboard.press('n');
  await expect(page.getByText(/That is the gap/i)).toBeVisible();
  await page.getByRole('button', { name: /Next practice target/i }).click();
  await page.getByRole('button', { name: /Gap at top/i }).click();
  await page.getByRole('button', { name: /Begin measured run/i }).click();

  await expect(page.getByRole('button', { name: /No gap visible/i })).toBeVisible();

  // No-gap responses advance the adaptive run. Axes may now end before the
  // 39-presentation maximum when a display boundary is confirmed.
  for (let response = 0; response < 39; response += 1) {
    if (await page.locator('.results-view').count()) break;
    const canvas = page.locator('[data-target]');
    await expect(canvas).toBeVisible();
    await expect
      .poll(() =>
        canvas.evaluate((node) => {
          const ctx = node.getContext('2d');
          const { data } = ctx.getImageData(0, 0, node.width, node.height);
          let opaque = 0;
          for (let i = 3; i < data.length; i += 400) if (data[i] > 0) opaque += 1;
          return opaque;
        }),
      )
      .toBeGreaterThan(0);
    await page.getByRole('button', { name: /No gap visible/i }).click();
  }

  await expect(
    page.getByRole('heading', { name: /thresholds from this run|Run inconclusive/i }),
  ).toBeVisible();
  await expect(page.locator('.cb-threshold-card')).toHaveCount(3);
  await expect(page.locator('.result-note')).toContainText('cannot confirm or rule out');
  await expect(page.getByText(/No colour-vision deficiency detected/i)).toHaveCount(0);

  const resultScan = await new AxeBuilder({ page }).analyze();
  expect(resultScan.violations).toEqual([]);
});

test('the mobile Daltonia target and direction controls fit the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await page.goto('/#/color-blindness');
  await page.getByRole('button', { name: /Start the experiment/i }).click();
  await page.getByLabel(/My colour filters are off and I understand/i).check();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-target]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Gap at top/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /No gap visible/i })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
});
