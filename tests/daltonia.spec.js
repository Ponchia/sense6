import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createAdaptiveRun, currentAdaptiveTrial, recordAdaptiveAnswer } from '../src/lib/daltonism.js';
import { seededRandom } from '../src/lib/random.js';
import { expectInVisualViewport, expectJournalEntry, expectNoHorizontalOverflow } from './helpers/browser.js';

const AUDITED_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
];
const DALTONIA_RESULT_SEED = 'mobile-result-audit';

async function installDeterministicDaltonia(page) {
  await page.addInitScript((seed) => {
    window.__SENSE6_TEST_CONFIG__ = { daltonia: { seed } };
  }, DALTONIA_RESULT_SEED);
}

async function startPractice(page, locale = 'en') {
  await page.goto(`/${locale}/color-blindness/`);
  await page.locator('[data-action="cb-setup"]').click();
  await page.locator('#cb-ready').check();
  await page.locator('#cb-start').click();
  await expect(page.locator('[data-target]')).toBeVisible();
}

async function startMeasuredRun(page, locale = 'en') {
  await startPractice(page, locale);
  await page.locator('[data-orientation="right"]').click();
  await page.locator('[data-action="cb-practice-next"]').click();
  await page.locator('[data-orientation="up"]').click();
  await page.locator('[data-action="cb-practice-next"]').click();
  await expect(page.locator('[data-measurement-active]')).toBeVisible();
}

async function finishWithNoGap(page) {
  for (let response = 0; response < 39; response += 1) {
    if (await page.locator('.results-view').count()) return;
    await page.locator('[data-orientation="unseen"]').click();
  }
}

async function finishWithCorrectAnswers(page) {
  const mirror = createAdaptiveRun(seededRandom(`daltonia:${DALTONIA_RESULT_SEED}`));
  for (let response = 0; response < 39; response += 1) {
    const trial = currentAdaptiveTrial(mirror);
    if (!trial) break;
    await page.locator(`[data-orientation="${trial.orientation}"]`).click();
    recordAdaptiveAnswer(mirror, trial.orientation);
  }
  await expect(page.locator('.results-view')).toBeVisible();
  expect(mirror.controls).toEqual({ correct: 3, total: 3 });
}

async function expectNoNarrowTextColumns(page, rootSelector, label) {
  const narrow = await page.locator(rootSelector).evaluate((root) =>
    [
      ...root.querySelectorAll(
        'h1, h2, p, label span, .cb-verdict strong, .cb-verdict small, .cb-scorecard__value > span, .ui-button',
      ),
    ]
      .filter((element) => element.getClientRects().length > 0 && element.textContent.trim().length > 4)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
        return { text: element.textContent.trim(), width: rect.width, minimum: fontSize * 1.5 };
      })
      .filter(({ width, minimum }) => width + 0.5 < minimum),
  );
  expect(narrow, `${label}: ${JSON.stringify(narrow)}`).toEqual([]);
}

async function centerBelowStickyChrome(locator) {
  await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const chromeBottom = document.querySelector('.site-chrome')?.getBoundingClientRect().bottom ?? 0;
    const usableCenter = chromeBottom + (viewportHeight - chromeBottom) / 2;
    const elementCenter = rect.top + rect.height / 2;
    window.scrollBy({ behavior: 'instant', top: elementCenter - usableCenter });
  });
}

async function trialGeometry(page) {
  return page.evaluate(() => {
    const viewport = window.visualViewport;
    const bounds = {
      left: viewport?.offsetLeft ?? 0,
      top: viewport?.offsetTop ?? 0,
      right: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth),
      bottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
    };
    const chromeBottom = document.querySelector('.site-chrome')?.getBoundingClientRect().bottom ?? 0;
    const elements = [
      document.querySelector('[data-target]'),
      ...document.querySelectorAll('[data-orientation]'),
    ];
    return elements.map((element) => {
      const rect = element.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const hit = document.elementFromPoint(center.x, center.y);
      return {
        name: element.dataset.orientation ?? 'stimulus',
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        inside:
          rect.left >= bounds.left - 0.5 &&
          rect.top >= Math.max(bounds.top, chromeBottom) - 0.5 &&
          rect.right <= bounds.right + 0.5 &&
          rect.bottom <= bounds.bottom + 0.5,
        hit: hit === element || element.contains(hit),
        touchTarget: element.matches('button') ? rect.width >= 44 && rect.height >= 44 : true,
      };
    });
  });
}

test('the Daltonia experiment renders adaptive targets and reports non-clinical levels @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/color-blindness/');
  await expect(page.getByRole('heading', { name: /Find the gap in the dots/i })).toBeVisible();
  await expect(page.getByText('Three staircases', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Daltonia/i })).toBeVisible();
  await expect(page.locator('.cb-signal-strip i')).toHaveCount(36);
  await expect(page.locator('.cb-axis-display__card')).toHaveCount(3);
  await expect(page.locator('.cb-boundary.method')).toBeVisible();
  await expect(page.locator('.cb-research .source-list li')).toHaveCount(6);
  await expect(page.locator('.cb-closing').getByRole('button', { name: /Open test/i })).toBeVisible();

  const methodColours = await page.evaluate(() => {
    const target = document.querySelector('.cb-boundary .method-steps strong');
    return {
      text: getComputedStyle(target).color,
      background: getComputedStyle(document.querySelector('.cb-boundary')).backgroundColor,
    };
  });
  expect(methodColours.text).not.toEqual(methodColours.background);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole('button', { name: /Start the experiment/i }).click();
  const begin = page.getByRole('button', { name: /Start practice/i });
  await expect(begin).toBeDisabled();
  await expect(page.locator('.experiment-boundary')).toHaveText(
    /recreational experiment for curiosity and fun—not a medical test or diagnosis/i,
  );
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
  await expect(page.getByRole('button', { name: /Next practice target/i })).toBeFocused();
  await page.locator('.cb-prompt').dispatchEvent('keydown', { key: 'n' });
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
  await expectJournalEntry(page, 'color-blindness');

  const resultScan = await new AxeBuilder({ page }).analyze();
  expect(resultScan.violations).toEqual([]);
});

test('Daltonia rejects pre-paint and duplicate measured responses', async ({ page }) => {
  await startPractice(page);
  await page.locator('[data-orientation="right"]').click();
  await page.locator('[data-action="cb-practice-next"]').click();
  await page.locator('[data-orientation="up"]').click();

  await page.evaluate(() => {
    const native = window.requestAnimationFrame;
    const queue = [];
    window.__sense6RafProbe = { native, queue };
    window.requestAnimationFrame = (callback) => {
      queue.push(callback);
      return queue.length;
    };
  });
  await page.locator('[data-action="cb-practice-next"]').click();
  await expect(page.locator('[data-orientation="unseen"]')).toBeDisabled();
  await page.keyboard.press('n');
  await expect(page.locator('.trial-count b')).toHaveText('01');

  await page.evaluate(() => {
    const probe = window.__sense6RafProbe;
    while (probe.queue.length) probe.queue.shift()(performance.now());
    window.requestAnimationFrame = probe.native;
    delete window.__sense6RafProbe;
  });
  await expect(page.locator('[data-orientation="unseen"]')).toBeEnabled();
  await page.evaluate(() => {
    const dispatch = () =>
      document
        .querySelector('.cb-prompt')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    dispatch();
    dispatch();
  });
  await expect(page.locator('.trial-count b')).toHaveText('02');
});

test('the complete mobile trial is visible and hit-testable at every audited viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');

  for (const locale of ['en', 'de']) {
    for (const viewport of AUDITED_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await startPractice(page, locale);
      for (const stage of ['practice', 'measured']) {
        const geometry = await trialGeometry(page);
        expect(geometry, `${locale} ${viewport.width}x${viewport.height} ${stage}`).toHaveLength(6);
        expect(
          geometry.filter((entry) => !entry.inside || !entry.hit || !entry.touchTarget),
          `${locale} ${viewport.width}x${viewport.height} ${stage}: ${JSON.stringify(geometry)}`,
        ).toEqual([]);
        const clippedLabels = await page.locator('.cb-direction small').evaluateAll((labels) =>
          labels
            .filter((label) => {
              const rect = label.getBoundingClientRect();
              const button = label.closest('button').getBoundingClientRect();
              return (
                rect.bottom > button.bottom + 1 ||
                rect.top < button.top - 1 ||
                label.scrollWidth > label.clientWidth + 1
              );
            })
            .map((label) => label.textContent),
        );
        expect(clippedLabels, `${locale} ${viewport.width}x${viewport.height}: direction labels`).toEqual([]);
        if (locale === 'de' && viewport.width === 844 && stage === 'practice') {
          await page.screenshot({
            path: testInfo.outputPath('daltonia-landscape.png'),
            animations: 'disabled',
          });
        }
        if (stage === 'practice') {
          await page.locator('[data-orientation="right"]').click();
          const advance = page.locator('[data-action="cb-practice-next"]');
          await expect(advance).toBeFocused();
          await expect(page.locator('.cb-response-set')).toHaveCount(0);
          const advanceGeometry = await advance.evaluate((button) => {
            const viewport = window.visualViewport;
            const rect = button.getBoundingClientRect();
            const chromeBottom = document.querySelector('.site-chrome')?.getBoundingClientRect().bottom ?? 0;
            const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            return {
              inside:
                rect.top >= Math.max(viewport?.offsetTop ?? 0, chromeBottom) - 0.5 &&
                rect.bottom <= (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) + 0.5,
              hit: button.contains(document.elementFromPoint(center.x, center.y)),
            };
          });
          expect(advanceGeometry, `${locale} ${viewport.width}x${viewport.height} practice advance`).toEqual({
            inside: true,
            hit: true,
          });
          await page.locator('[data-action="cb-practice-next"]').click();
          await page.locator('[data-orientation="up"]').click();
          await page.locator('[data-action="cb-practice-next"]').click();
        }
      }
    }
  }
});

test('the primary mobile landing action appears before the decorative preview', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only landing priority check');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/en/color-blindness/');
  await expect(page.locator('[data-action="cb-setup"]')).toBeVisible();
  await expect(page.locator('.cb-hero__plate')).toBeVisible();
  const priority = await page.evaluate(() => {
    const action = document.querySelector('[data-action="cb-setup"]').getBoundingClientRect();
    const preview = document.querySelector('.cb-hero__plate').getBoundingClientRect();
    const viewportBottom = window.visualViewport?.height ?? window.innerHeight;
    return { actionVisible: action.bottom <= viewportBottom, actionBeforePreview: action.top < preview.top };
  });
  expect(priority).toEqual({ actionVisible: true, actionBeforePreview: true });
});

test('mobile setup keeps its checkbox and primary action reachable across audited viewports', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only setup geometry check');
  for (const locale of ['en', 'de']) {
    for (const viewport of AUDITED_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto(`/${locale}/color-blindness/`);
      await expectNoHorizontalOverflow(page, `${locale} ${viewport.width}x${viewport.height} landing`);
      await page.locator('[data-action="cb-setup"]').click();
      await expect(page.locator('.experiment-boundary')).toBeVisible();
      await expectNoHorizontalOverflow(page, `${locale} ${viewport.width}x${viewport.height} setup`);
      const ready = page.locator('#cb-ready');
      await ready.scrollIntoViewIfNeeded();
      await expectInVisualViewport(ready, `${locale} ${viewport.width}x${viewport.height} setup checkbox`, {
        hitTest: true,
      });
      await ready.check();
      const start = page.locator('#cb-start');
      await start.scrollIntoViewIfNeeded();
      await expectInVisualViewport(start, `${locale} ${viewport.width}x${viewport.height} setup CTA`, {
        hitTest: true,
      });
    }
  }
});

test('real passing results explain adaptive levels and control evidence at every viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only result geometry check');
  await installDeterministicDaltonia(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await startMeasuredRun(page, 'de');
  await finishWithCorrectAnswers(page);

  await expect(page.locator('.results-head h1')).toContainText(
    'Bildschirmbezogene adaptive Stufen dieses Durchlaufs',
  );
  await expect(page.locator('.cb-verdict')).toContainText('Kontrollen bestanden');
  await expect(page.locator('.cb-verdict')).toContainText('3/3 richtig / geplant');
  await expect(page.locator('.cb-threshold-card')).toHaveCount(3);
  await expect(page.locator('.cb-threshold-card .cb-scorecard__value > span')).toHaveText([
    'Adaptive Endstufe',
    'Adaptive Endstufe',
    'Adaptive Endstufe',
  ]);
  await expect(page.locator('.cb-scorecard--control')).toContainText(
    '3 von 3 geplanten Kontrollen mit kontrastreicher Lücke wurden richtig beantwortet.',
  );
  await expect(page.locator('.result-note')).toContainText('weder bestätigen noch ausschließen');

  const resultScan = await new AxeBuilder({ page }).analyze();
  expect(resultScan.violations).toEqual([]);

  for (const viewport of AUDITED_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page, `${viewport.width}x${viewport.height} passing results`);
    await expectNoNarrowTextColumns(
      page,
      '.results-view',
      `${viewport.width}x${viewport.height} passing results`,
    );
    for (const action of await page.locator('.results-actions .ui-button').all()) {
      await action.scrollIntoViewIfNeeded();
      await expectInVisualViewport(action, `${viewport.width}x${viewport.height} result action`, {
        hitTest: true,
      });
    }
  }
});

test('shortcuts ignore the locale select and focus returns after a keyboard answer', async ({ page }) => {
  await startMeasuredRun(page);
  const initialCount = await page.locator('.trial-count b').textContent();
  await page.locator('[data-locale-select]').evaluate((select) => {
    select.focus();
    select.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  });
  await expect(page.locator('.trial-count b')).toHaveText(initialCount);

  const initialSize = await page.locator('[data-target]').evaluate((canvas) => ({
    css: canvas.getBoundingClientRect().width,
    bitmap: canvas.width,
  }));
  await page.locator('[data-trial-focus]').focus();
  await page.keyboard.press('n');
  await expect(page.locator('[data-trial-focus]')).toBeFocused();
  await expect(page.locator('.trial-count b')).not.toHaveText(initialCount);
  await expect
    .poll(() =>
      page.locator('[data-target]').evaluate((canvas) => ({
        css: canvas.getBoundingClientRect().width,
        bitmap: canvas.width,
      })),
    )
    .toEqual(initialSize);
});

for (const [change, mutate] of [
  [
    'theme',
    (page) =>
      page.evaluate(() => {
        document.documentElement.dataset.theme =
          document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dispatchEvent(new Event('bronto:themechange'));
      }),
  ],
  ['geometry', (page) => page.setViewportSize({ width: 844, height: 390 })],
]) {
  test(`a ${change} change invalidates the measured run without saving it`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startMeasuredRun(page);
    await expect(page.locator('[data-bronto-theme-toggle]')).toBeDisabled();
    await expect(page.locator('[data-locale-select]')).toBeDisabled();
    await mutate(page);
    await expect(page.locator('[data-invalidated-by]')).toBeVisible();
    await expect(page.getByText(/stopped before a result/i)).toBeVisible();
    await expect(page.locator('.results-view')).toHaveCount(0);
    await expect(
      page.evaluate(() => JSON.parse(localStorage.getItem('sense6:journal') ?? '{"entries":[]}').entries),
    ).resolves.toEqual([]);
  });
}

test('forced colours are visible and block trial entry', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/en/color-blindness/');
  await page.locator('[data-action="cb-setup"]').click();
  await expect(page.getByText(/Colour override detected/i)).toBeVisible();
  await page.locator('#cb-ready').check();
  await expect(page.locator('#cb-start')).toBeDisabled();
});

test('storage failures produce a persistent recovery warning and contained result heading', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage blocked', 'SecurityError');
    };
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await startMeasuredRun(page);
  await finishWithNoGap(page);
  await expect(page.getByRole('alert')).toContainText(/This result was not saved/i);
  await expect(page.locator('.results-actions .ui-button').first()).toContainText(/Copy run summary/i);
  const containment = await page.locator('.results-head').evaluate((heading) => {
    const clientWidth = document.documentElement.clientWidth;
    return [...heading.querySelectorAll('*')].every((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left >= -0.5 && rect.right <= clientWidth + 0.5;
    });
  });
  expect(containment).toBe(true);
});

test('Daltonia remains operable at 320px with 200% text sizing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Uses explicit text-only zoom geometry');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/en/color-blindness/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await page.locator('[data-action="cb-setup"]').click();
  await page.locator('#cb-ready').check();
  await page.locator('#cb-start').click();

  await expectNoHorizontalOverflow(page, '200% text Daltonia practice');
  for (const orientation of ['up', 'left', 'right', 'down', 'unseen']) {
    const answer = page.locator(`[data-orientation="${orientation}"]`);
    await centerBelowStickyChrome(answer);
    await expectInVisualViewport(answer, `200% text ${orientation} answer`, { hitTest: true });
  }
});

test('Daltonia results reflow at 320px with 200% text sizing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Uses explicit text-only zoom geometry');
  await installDeterministicDaltonia(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/en/color-blindness/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await expectNoHorizontalOverflow(page, '200% text Daltonia landing');
  await page.locator('[data-action="cb-setup"]').click();
  await expectNoHorizontalOverflow(page, '200% text Daltonia setup');
  await expectNoNarrowTextColumns(page, '.setup-view', '200% text Daltonia setup');
  const ready = page.locator('#cb-ready');
  await ready.scrollIntoViewIfNeeded();
  await expectInVisualViewport(ready, '200% text setup checkbox', { hitTest: true });
  await ready.check();
  const start = page.locator('#cb-start');
  await start.scrollIntoViewIfNeeded();
  await expectInVisualViewport(start, '200% text setup CTA', { hitTest: true });
  await start.click();
  await page.locator('[data-orientation="right"]').click();
  await page.locator('[data-action="cb-practice-next"]').click();
  await page.locator('[data-orientation="up"]').click();
  await page.locator('[data-action="cb-practice-next"]').click();
  await finishWithCorrectAnswers(page);

  await expect(
    page.getByRole('heading', { name: 'Display-relative adaptive levels from this run.' }),
  ).toBeVisible();
  await expect(page.locator('.cb-scorecard--control')).toContainText(
    '3 of 3 scheduled high-contrast gap controls were answered correctly.',
  );
  await expectNoHorizontalOverflow(page, '200% text Daltonia results');
  await expectNoNarrowTextColumns(page, '.results-view', '200% text Daltonia results');
  for (const action of await page.locator('.results-actions .ui-button').all()) {
    await action.scrollIntoViewIfNeeded();
    await expectInVisualViewport(action, '200% text result action', { hitTest: true });
  }
});
