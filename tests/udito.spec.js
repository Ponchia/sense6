import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  answerCurrentSoundTrial,
  captureMetrics,
  completeUditoSetup,
  expectJournalEntry,
  installQuickUdito,
} from './helpers/browser.js';

test('Udito completes three safe-listening instruments and keeps results separate', async ({ page }) => {
  await installQuickUdito(page);
  const metrics = await captureMetrics(page);
  await page.goto('/en/udito/');
  await expect(page).toHaveURL(/\/en\/udito\/$/);

  await expect(page.getByRole('heading', { name: /Listen for the boundary/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Udito/i })).toBeVisible();
  await expect(page.locator('.au-signal-strip i')).toHaveCount(56);
  await expect(page.locator('.au-instrument-visual')).toHaveCount(3);
  await expect(page.locator('.au-safety.method')).toBeVisible();
  await expect(page.locator('.au-safety-meter i')).toHaveCount(12);
  await expect(page.locator('.au-research .source-list li')).toHaveCount(6);
  await expect(page.locator('.au-closing').getByRole('button', { name: /Open test/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  await page.getByRole('button', { name: /See the method/i }).click();
  await expect(page.getByRole('heading', { name: /Three questions. No synthetic score/i })).toBeInViewport();

  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page
      .locator(
        '[data-au-device], [data-au-connection], [data-action="au-reference"], [data-action="au-anchors"]',
      )
      .evaluateAll((elements) =>
        elements.map((element) =>
          element.getAttribute('data-au-device') !== null
            ? 'device'
            : element.getAttribute('data-au-connection') !== null
              ? 'connection'
              : element.getAttribute('data-action'),
        ),
      ),
  ).toEqual(['device', 'connection', 'au-reference', 'au-anchors']);
  await expect(page.locator('.experiment-boundary')).toHaveText(
    /recreational experiment for curiosity and fun—not a medical test or diagnosis/i,
  );
  const start = page.getByRole('button', { name: /Begin selected scope/i });
  await expect(start).toBeDisabled();
  await completeUditoSetup(page);
  await expect(start).toBeEnabled();
  await page.getByLabel('Connection').selectOption('wireless');
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: /Play reference again/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
  await page.getByRole('button', { name: /audibility anchors/i }).click();
  await page.getByLabel(/I heard all three anchors comfortably/i).check();
  await expect(start).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await start.click();

  await expect(page.getByRole('heading', { name: /Which tone is quietest/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(2);
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H1');
  await expect(page.getByRole('button', { name: /Toggle light and dark theme/i })).toBeDisabled();
  await expect(page.locator('[data-locale-select]')).toBeDisabled();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
  await expect(page.locator('[data-au-status]')).not.toHaveAttribute('role');
  await expect(page.locator('[data-au-status]')).not.toHaveAttribute('aria-live');
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
  await page.getByRole('button', { name: /Yes, unchanged/i }).click();

  await expect(page.getByRole('heading', { name: /Three listening measures/i })).toBeVisible();
  await expect(page.locator('.au-metric')).toHaveCount(4);
  await expect(page.locator('.au-results__stamp')).toContainText('Upper run boundary');
  await expect(page.locator('.au-results__stamp strong')).toHaveText(
    await page.locator('.au-metric').nth(1).locator(':scope > strong').innerText(),
  );
  await expect(page.getByRole('article', { name: /Headphone confidence/i })).toBeVisible();
  await expect(page.getByRole('article', { name: /Upper run boundary/i })).toBeVisible();
  await expect(page.getByRole('article', { name: /Pitch step near 500 Hz/i })).toBeVisible();
  await expect(page.getByRole('article', { name: /Pitch step near 2 kHz/i })).toBeVisible();
  await expect(page.getByText(/Device-relative, never dB HL/i)).toBeVisible();
  await expect(page.getByText(/hearing age/i)).toBeVisible();
  await expect(page.getByText(/composite hearing score/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Toggle light and dark theme/i })).toBeEnabled();
  await expect(page.locator('[data-locale-select]')).toBeEnabled();
  await expectJournalEntry(page, 'udito');
  await expect
    .poll(() => metrics)
    .toEqual([
      { event: 'site_loaded', test: 'site' },
      { event: 'test_viewed', test: 'udito' },
      { event: 'test_started', test: 'udito' },
      { event: 'test_completed', test: 'udito' },
    ]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const journalSetup = await page.evaluate(() => {
    const journal = JSON.parse(localStorage.getItem('sense6:journal') ?? 'null');
    return journal.entries.find((entry) => entry.examId === 'udito').setup;
  });
  expect(journalSetup.connection).toBe('wireless');
  expect(journalSetup.selfReportedVolumeConsistent).toBe(true);
  expect(journalSetup.volumeLockedWithinRun).toBeUndefined();
  expect(await page.evaluate(() => Boolean(navigator.mediaDevices))).toBe(true);
  await page.evaluate(() => navigator.mediaDevices.dispatchEvent(new Event('devicechange')));
  await expect(page.getByRole('heading', { name: /Three listening measures/i })).toBeVisible();
  await expect(page.locator('.au-metric')).toHaveCount(4);
  await page.getByRole('button', { name: /Open private journal/i }).click();
  await expect(page).toHaveURL(/\/en\/journal\/$/);
  await expect(page.getByRole('heading', { name: /Your private measurement journal/i })).toBeVisible();
});

test('an audio-output change stops an active Udito run at the setup boundary', async ({ page }) => {
  await installQuickUdito(page);
  await page.goto('/en/udito/');
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await completeUditoSetup(page);
  await page.getByRole('button', { name: /Begin selected scope/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();

  await page.evaluate(() => navigator.mediaDevices.dispatchEvent(new Event('devicechange')));

  await expect(page.locator('[data-au-paused]')).toHaveAttribute('data-resume-mode', 'setup');
  await expect(page.getByRole('button', { name: /Return to audio setup/i })).toBeVisible();
  await expect(page.locator('[data-au-response]')).toHaveCount(0);
});

test('Udito focused scope ends after Portata and omits pitch placeholders @pr-smoke', async ({ page }) => {
  await installQuickUdito(page);
  await page.goto('/en/udito/');
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await page.locator('[data-action="au-scope"][data-scope="focused"]').click();
  await completeUditoSetup(page);
  await page.getByRole('button', { name: /Begin selected scope/i }).click();

  await page.getByRole('button', { name: /Start practice/i }).click();
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Begin headphone check/i }).click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Continue to Portata/i }).click();
  await page.getByRole('button', { name: /Start Portata/i }).click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Yes, unchanged/i }).click();

  await expect(page.getByRole('heading', { name: /Two focused listening measures/i })).toBeVisible();
  await expect(page.locator('.au-results__stamp')).toContainText('Upper run boundary');
  await expect(page.locator('.au-results__stamp strong')).toHaveText(
    await page.locator('.au-metric').nth(1).locator(':scope > strong').innerText(),
  );
  await expect(page.locator('.au-metric')).toHaveCount(2);
  await expect(page.getByText(/Pitch step near/i)).toHaveCount(0);
  await expectJournalEntry(page, 'udito');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const journal = JSON.parse(localStorage.getItem('sense6:journal') ?? 'null');
        return journal.entries.find((entry) => entry.examId === 'udito').protocol.profileId;
      }),
    )
    .toBe('focused');
  await expect(page.locator('.au-results__learn a')).toHaveAttribute('href', '/en/hearing-range-guide/');
  await page.locator('.au-results__learn a').click();
  await expect(page).toHaveURL(/\/en\/hearing-range-guide\/$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Can a browser test your hearing range?' }),
  ).toBeVisible();
});

test('German focused Udito results keep the heading and caution copy localized @pr-smoke', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One end-to-end locale contract per PR');
  await installQuickUdito(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/de/udito/');
  await page.locator('[data-action="au-setup"]').click();
  await page.locator('[data-action="au-scope"][data-scope="focused"]').click();
  await page.locator('[data-action="au-reference"]').click();
  await expect(page.locator('[data-au-reference-status]')).toContainText(
    'Referenz nach Audiouhr abgeschlossen',
  );
  await page.locator('[data-action="au-anchors"]').click();
  await page.locator('[data-au-anchors-confirmed]').check();
  await page.locator('[data-au-consent]').check();
  await page.locator('[data-action="au-start"]').click();
  await page.locator('[data-action="au-begin-stage"]').click();
  await answerCurrentSoundTrial(page);
  await page.locator('[data-action="au-begin-measured"]').click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);
  await page.locator('[data-action="au-next-stage"]').click();
  await page.locator('[data-action="au-begin-stage"]').click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);
  await page.locator('[data-volume-consistent="true"]').click();
  await expect(page.locator('.au-results__hero h1')).toContainText('Zwei fokussierte Hörmessungen.');
  await expect(page.locator('.au-results__stamp')).toContainText('Obere Laufgrenze');
  const explanation = page.locator('.au-results__hero > div:first-child > p:last-child');
  await expect(explanation).toContainText(/Einrichtungskontrollen|Mindestens eine Prüfung/);
  await expect(explanation).not.toContainText(
    /At least one setup check|The setup checks and adaptive tracks/,
  );
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
});

test('Udito shows a settled upper boundary as a lower bound with its run evidence', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser deterministic bound journey');
  await page.addInitScript(
    (configuration) => {
      window.__SENSE6_TEST_CONFIG__ = configuration;
    },
    {
      udito: {
        feedbackMs: 2,
        audio: { toneMs: 8, gapMs: 4, rampMs: 1, referenceMs: 18 },
        headphones: { practiceTrials: 1, scoredTrials: 1, passCorrect: 1 },
        range: { startHz: 18000, targetReversals: 6, minTrials: 2, maxTrials: 2, controlAt: [0] },
      },
    },
  );
  await page.goto('/en/udito/');
  await page.locator('[data-action="au-setup"]').click();
  await page.locator('[data-action="au-scope"][data-scope="focused"]').click();
  await completeUditoSetup(page);
  await page.locator('[data-action="au-start"]').click();
  await expect(page.locator('.au-brief__copy .ui-eyebrow')).toContainText('01 of 02');
  await page.locator('[data-action="au-begin-stage"]').click();
  await answerCurrentSoundTrial(page);
  await page.locator('[data-action="au-begin-measured"]').click();
  await answerCurrentSoundTrial(page);
  await page.locator('[data-action="au-next-stage"]').click();
  await expect(page.locator('.au-brief__copy .ui-eyebrow')).toContainText('02 of 02');
  await page.locator('[data-action="au-begin-stage"]').click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);
  await page.locator('[data-volume-consistent="true"]').click();

  const boundary = page.getByRole('article', { name: /Upper run boundary/i });
  await expect(boundary.locator('> strong')).toHaveText('≥ 18,000 Hz');
  await expect(boundary.locator('> small')).toContainText(
    'Bounded at the technical frequency ceiling · 0 reversals / 2 trials',
  );
  await expect(boundary).toContainText(/personal boundary may be higher/i);
  await expect(page.locator('.au-results__stamp')).toContainText('Upper run boundary');
  await expect(page.locator('.au-results__stamp')).toContainText('Setup checks coherent');
  await expect(page.locator('.au-results__stamp strong')).toHaveText('≥ 18,000 Hz');
  await expect(page.getByText('100% (1/1 controls)')).toBeVisible();
});

test('German Udito stages localize generated listening labels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser locale journey');
  await page.setViewportSize({ width: 360, height: 800 });
  await installQuickUdito(page);
  await page.goto('/de/udito/');
  await page.locator('[data-action="au-setup"]').click();
  await expect(page.locator('.au-setup h1')).toContainText('Ruhiger Raum.');
  await expect(page.locator('.experiment-boundary')).toContainText('Freizeitexperiment');
  await expectUditoGeometry(page, '360x800 German setup');
  await page.locator('[data-action="au-reference"]').click();
  await expect(page.locator('[data-au-reference-status]')).toContainText(
    'Referenz nach Audiouhr abgeschlossen',
  );
  await page.locator('[data-action="au-anchors"]').click();
  await page.locator('[data-au-anchors-confirmed]').check();
  await page.locator('[data-au-consent]').check();
  await page.locator('[data-action="au-start"]').click();
  await expect(page.locator('.au-brief__copy')).toContainText('Kopfhörer-Konfidenz');
  await expect(page.getByRole('heading', { name: 'Welcher Ton ist am leisesten?' })).toBeVisible();
  await expect(page.locator('#announcer')).toHaveText('Die Anweisungen für Cuffie sind bereit.');
  await page.locator('[data-action="au-begin-stage"]').click();
  await expect(page.getByRole('heading', { name: 'Hörtest für Cuffie' })).toBeAttached();
  await expect(page.locator('#announcer')).toHaveText('Der Tonlauf für Cuffie ist bereit.');
  await expect(page.locator('.au-runner__header strong')).toHaveText('Übung');
  await expect(page.locator('[data-au-response="0"]')).toContainText('Intervall 1');
  await expect(page.locator('[data-action="au-stop"]')).toHaveText('Sicher stoppen');
  await expect(page.locator('.au-runner__footer')).toContainText('Kurze ein- und ausgeblendete Töne');
  await expectUditoGeometry(page, '360x800 German runner', { runner: true });
  await answerCurrentSoundTrial(page);
  await expect(page.getByRole('heading', { name: 'Jetzt folgen sechs Messversuche.' })).toBeVisible();
});

test('the mobile Udito setup and listening runner stay inside the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await installQuickUdito(page);
  await page.goto('/en/udito/');
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await completeUditoSetup(page);
  await page.getByRole('button', { name: /Begin selected scope/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();

  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const controls = [
          ...document.querySelectorAll('[data-au-response]'),
          document.querySelector('[data-action="au-stop"]'),
        ].filter(Boolean);
        return controls.every((control) => {
          const rect = control.getBoundingClientRect();
          return (
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= window.innerWidth &&
            rect.bottom <= window.innerHeight
          );
        });
      }),
    )
    .toBe(true);
  const stopBox = await page.getByRole('button', { name: /Stop safely/i }).boundingBox();
  expect(stopBox.width).toBeGreaterThanOrEqual(44);
  expect(stopBox.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: /Listen for the boundary/i })).toBeVisible();
});

test('audio-clock interruption keeps the gate closed and persistent playback failure has a safe exit', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop Chromium audio-state simulation');
  await page.addInitScript(
    (configuration) => {
      window.__SENSE6_TEST_CONFIG__ = configuration;
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext {
        constructor(options) {
          super(options);
          window.__trackedUditoAudioContext = this;
        }
      };
    },
    {
      udito: {
        feedbackMs: 20,
        audio: { toneMs: 180, gapMs: 50, rampMs: 10, referenceMs: 350 },
        headphones: { practiceTrials: 1, scoredTrials: 1, passCorrect: 1 },
        range: { targetReversals: 0, minTrials: 1, maxTrials: 1, controlAt: [] },
        pitch: { targetReversals: 0, minTrials: 1, maxTrials: 1 },
      },
    },
  );
  await page.goto('/en/udito/');
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  const start = page.getByRole('button', { name: /Begin selected scope/i });
  await page.getByRole('button', { name: /Play maximum-level reference/i }).click();
  await page.waitForTimeout(90);
  await page.evaluate(() => window.__trackedUditoAudioContext.suspend());
  await expect(page.getByText(/reference did not complete on the audio clock/i)).toBeVisible();
  await expect(start).toBeDisabled();

  await page.getByRole('button', { name: /Play reference again/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
  await page.getByRole('button', { name: /audibility anchors/i }).click();
  await page.getByLabel(/I heard all three anchors comfortably/i).check();
  await expect(start).toBeEnabled();
  await start.click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await page.waitForTimeout(60);
  await page.evaluate(() => window.__trackedUditoAudioContext.suspend());
  await expect(page.locator('[data-au-paused]')).toHaveAttribute('data-resume-mode', 'replay');
  await expect(page.getByRole('button', { name: /Replay this trial/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /End run and return to Udito/i })).toBeVisible();

  await page.evaluate(() => {
    window.__trackedUditoAudioContext.createOscillator = () => {
      throw new Error('persistent oscillator failure');
    };
  });
  await page.getByRole('button', { name: /Replay this trial/i }).click();
  await expect(page.getByRole('button', { name: /End run and return to Udito/i })).toBeVisible();
  await page.getByRole('button', { name: /End run and return to Udito/i }).click();
  await expect(page.getByRole('heading', { name: /Listen for the boundary/i })).toBeVisible();
});

test('navigation during every Udito playback stage leaves no stale continuation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser lifecycle regression');
  await page.addInitScript(
    (configuration) => {
      window.__SENSE6_TEST_CONFIG__ = configuration;
    },
    {
      udito: {
        feedbackMs: 20,
        audio: { toneMs: 350, gapMs: 30, rampMs: 8, referenceMs: 800 },
        headphones: { practiceTrials: 1, scoredTrials: 1, passCorrect: 1 },
        range: { targetReversals: 0, minTrials: 1, maxTrials: 1, controlAt: [] },
        pitch: { targetReversals: 0, minTrials: 1, maxTrials: 1 },
      },
    },
  );
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const stage of ['reference', 'anchors', 'trial']) {
    await page.goto('/en/udito/');
    await page.locator('[data-action="au-setup"]').click();

    if (stage === 'reference') {
      await page.locator('[data-action="au-reference"]').click();
      await expect(page.locator('[data-action="au-reference"]')).toContainText('Playing');
    } else {
      await page.locator('[data-action="au-reference"]').click();
      await expect(page.locator('[data-au-reference-status]')).toContainText(
        'Reference completed on the audio clock',
      );
      await page.locator('[data-action="au-anchors"]').click();
      if (stage === 'anchors') {
        await expect(page.locator('[data-au-anchor-status]')).toContainText('Playing');
      } else {
        await expect(page.locator('[data-au-anchors-confirmed]')).toBeEnabled();
        await page.locator('[data-au-anchors-confirmed]').check();
        await page.locator('[data-au-consent]').check();
        await page.locator('[data-action="au-start"]').click();
        await page.locator('[data-action="au-begin-stage"]').click();
        await expect(page.locator('[data-au-status]')).toHaveText(/Listen|Sound 1/);
        page.once('dialog', (dialog) => dialog.accept());
      }
    }

    await page.locator('.brand').click();
    await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
});

test('a superseded Udito mount cannot alter the replacement mount', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser lifecycle regression');
  await page.addInitScript(
    (configuration) => {
      window.__SENSE6_TEST_CONFIG__ = configuration;
    },
    {
      udito: {
        audio: { toneMs: 50, gapMs: 10, rampMs: 4, referenceMs: 800 },
      },
    },
  );
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/en/udito/');
  await page.locator('[data-action="au-setup"]').click();
  await page.locator('[data-action="au-reference"]').click();
  await expect(page.locator('[data-action="au-reference"]')).toContainText('Playing');

  await page.evaluate(async () => {
    const { mount } = await import('/src/exams/udito.js');
    window.__disposeRapidUditoMount = mount({
      app: document.querySelector('#app'),
      announcer: document.querySelector('#announcer'),
      locale: 'en',
      navigate() {},
      navigateHome() {},
    });
    document.querySelector('[data-action="au-setup"]').click();
    document.querySelector('[data-action="au-reference"]').click();
  });

  await expect(page.locator('[data-au-reference-status]')).toContainText(
    'Reference completed on the audio clock',
  );
  await expect(page.getByText('The reference sound did not complete.', { exact: true })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
  await page.evaluate(() => window.__disposeRapidUditoMount());
});

test('Udito accepts its existing latest-result shape and rejects malformed records', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser storage validation');
  await page.goto('/en/udito/');
  await page.evaluate(() => {
    localStorage.setItem(
      'sense6:udito:last',
      JSON.stringify({
        setupQuality: 'Setup checks coherent',
        sampleRate: 48_000,
        recordedAt: 1_721_000_000_000,
      }),
    );
  });
  await page.reload();
  await expect(page.locator('.previous-score')).toContainText('Setup checks coherent');

  await page.evaluate(() => {
    localStorage.setItem(
      'sense6:udito:last',
      JSON.stringify({
        format: 'sense6-result',
        schemaVersion: 1,
        payload: {
          setupQuality: '<img src=x onerror=alert(1)>',
          sampleRate: '48000',
          recordedAt: null,
        },
      }),
    );
  });
  await page.reload();
  await expect(page.locator('.previous-score')).toHaveCount(0);
});

test('visibility changes replay only uncommitted trials and advance after committed feedback', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Controlled visibility-state simulation');
  await page.addInitScript(
    (configuration) => {
      window.__SENSE6_TEST_CONFIG__ = configuration;
    },
    {
      udito: {
        feedbackMs: 300,
        audio: { toneMs: 100, gapMs: 30, rampMs: 8, referenceMs: 30 },
        headphones: { practiceTrials: 2, scoredTrials: 2, passCorrect: 2 },
        range: { targetReversals: 0, minTrials: 1, maxTrials: 1, controlAt: [] },
        pitch: { targetReversals: 0, minTrials: 1, maxTrials: 1 },
      },
    },
  );
  await page.goto('/en/udito/');
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await completeUditoSetup(page);
  await page.getByRole('button', { name: /Begin selected scope/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();

  const playingId = await page.locator('[data-au-runner]').getAttribute('data-trial-id');
  await setDocumentHidden(page, true);
  await expect(page.locator('[data-au-paused]')).toHaveAttribute('data-resume-mode', 'replay');
  await setDocumentHidden(page, false);
  await page.getByRole('button', { name: /Replay this trial/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
  await expect(page.locator('[data-au-runner]')).toHaveAttribute('data-trial-id', playingId);
  await answerCurrentSoundTrial(page);
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
  await expect(page.getByText(/Yes—that was the quieter tone/i)).toBeVisible();

  const awaitingId = await page.locator('[data-au-runner]').getAttribute('data-trial-id');
  await setDocumentHidden(page, true);
  await expect(page.locator('[data-au-paused]')).toHaveAttribute('data-resume-mode', 'replay');
  await setDocumentHidden(page, false);
  await page.getByRole('button', { name: /Replay this trial/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
  await expect(page.locator('[data-au-runner]')).toHaveAttribute('data-trial-id', awaitingId);
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Begin headphone check/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();

  const committedId = await page.locator('[data-au-runner]').getAttribute('data-trial-id');
  await page.evaluate(() => {
    const runner = document.querySelector('[data-au-runner]');
    const correct = runner.dataset.correctInterval;
    document.querySelector(`[data-au-response="${correct}"]`).click();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('[data-au-paused]')).toHaveAttribute('data-resume-mode', 'advance');
  await expect(page.locator('[data-au-paused]')).toContainText(/recorded response is kept exactly once/i);
  await setDocumentHidden(page, false);
  await page.getByRole('button', { name: /Continue after recorded response/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
  await expect(page.locator('[data-au-count]')).toHaveText('2 / 2');
  await expect(page.locator('[data-au-runner]')).not.toHaveAttribute('data-trial-id', committedId);
  await answerCurrentSoundTrial(page);
  await expect(page.getByText(/2 of 2 quiet targets located/i)).toBeVisible();
});

test('short landscape runner reserves non-overlapping status, controls, and feedback', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Explicit short-landscape geometry');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(
    (configuration) => {
      window.__SENSE6_TEST_CONFIG__ = configuration;
    },
    {
      udito: {
        feedbackMs: 600,
        audio: { toneMs: 8, gapMs: 4, rampMs: 1, referenceMs: 18 },
        headphones: { practiceTrials: 2, scoredTrials: 1, passCorrect: 1 },
        range: { targetReversals: 0, minTrials: 1, maxTrials: 1, controlAt: [] },
        pitch: { targetReversals: 0, minTrials: 1, maxTrials: 1 },
      },
    },
  );
  await page.goto('/en/udito/');
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await completeUditoSetup(page);
  await page.getByRole('button', { name: /Begin selected scope/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
  await answerCurrentSoundTrial(page);
  await expect(page.getByText(/Yes—that was the quieter tone/i)).toBeVisible();

  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const bounds = document.querySelector(selector).getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right };
    };
    return {
      header: rect('.au-runner__header'),
      status: rect('[data-au-status]'),
      intervals: rect('[data-au-intervals]'),
      responses: rect('.au-responses'),
      feedback: rect('[data-au-feedback]'),
      footerDisplay: getComputedStyle(document.querySelector('.au-runner__footer')).display,
      height: innerHeight,
    };
  });
  expect(geometry.status.top).toBeGreaterThanOrEqual(geometry.header.bottom);
  expect(geometry.intervals.top).toBeGreaterThanOrEqual(geometry.status.bottom);
  expect(geometry.responses.top).toBeGreaterThanOrEqual(geometry.intervals.bottom);
  expect(geometry.feedback.top).toBeGreaterThanOrEqual(geometry.responses.bottom);
  expect(geometry.feedback.bottom).toBeLessThanOrEqual(geometry.height);
  expect(geometry.footerDisplay).toBe('none');
  const stopBox = await page.getByRole('button', { name: /Stop safely/i }).boundingBox();
  expect(stopBox?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test('Udito keeps every mobile scope and stage readable across the required viewport matrix', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Explicit responsive geometry matrix');
  test.setTimeout(120_000);
  await installQuickUdito(page);

  const cases = [
    { width: 320, height: 568, scope: 'standard', textScale: 2 },
    { width: 320, height: 568, scope: 'focused' },
    { width: 360, height: 800, scope: 'standard' },
    { width: 390, height: 844, scope: 'focused' },
    { width: 412, height: 915, scope: 'standard' },
    { width: 844, height: 390, scope: 'standard' },
  ];

  for (const responsiveCase of cases) {
    const label = `${responsiveCase.width}x${responsiveCase.height} ${responsiveCase.scope}${responsiveCase.textScale ? ' at 200% text' : ''}`;
    await page.setViewportSize({ width: responsiveCase.width, height: responsiveCase.height });
    await page.goto('/en/udito/');
    if (responsiveCase.textScale) {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
    }

    await page.locator('[data-action="au-setup"]').click();
    await page.locator('[data-au-device]').selectOption('assistive');
    await page.locator('[data-au-connection]').selectOption('integrated');
    await expectUditoGeometry(page, `${label} setup`);
    await completeUditoSetup(page);
    await page.locator(`[data-action="au-scope"][data-scope="${responsiveCase.scope}"]`).click();
    await page.locator('[data-action="au-start"]').click();

    await expectUditoGeometry(page, `${label} headphone brief`);
    await page.locator('[data-action="au-begin-stage"]').click();
    await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
    await expectUditoGeometry(page, `${label} headphone practice runner`, { runner: true });
    await answerCurrentSoundTrial(page);
    await expectUditoGeometry(page, `${label} practice transition`);
    await page.locator('[data-action="au-begin-measured"]').click();
    await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
    await expectUditoGeometry(page, `${label} headphone measured runner`, { runner: true });
    await answerCurrentSoundTrial(page);
    await answerCurrentSoundTrial(page);

    await expectUditoGeometry(page, `${label} Portata transition`);
    await page.locator('[data-action="au-next-stage"]').click();
    await expectUditoGeometry(page, `${label} Portata brief`);
    await page.locator('[data-action="au-begin-stage"]').click();
    await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
    await expectUditoGeometry(page, `${label} Portata runner`, { runner: true });
    await answerCurrentSoundTrial(page);
    await answerCurrentSoundTrial(page);

    if (responsiveCase.scope === 'standard') {
      await expectUditoGeometry(page, `${label} Intonazione transition`);
      await page.locator('[data-action="au-next-stage"]').click();
      await expectUditoGeometry(page, `${label} Intonazione brief`);
      await page.locator('[data-action="au-begin-stage"]').click();
      await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
      await expectUditoGeometry(page, `${label} Intonazione runner`, { runner: true });
      for (let trial = 0; trial < 4; trial += 1) await answerCurrentSoundTrial(page);
    }

    await expectUditoGeometry(page, `${label} volume transition`);
    await page.locator('[data-volume-consistent="true"]').click();
    await expectUditoGeometry(page, `${label} results`);
    await expect(page.locator('.au-metric')).toHaveCount(responsiveCase.scope === 'focused' ? 2 : 4);
    await expect(page.locator('.au-metric > strong')).toHaveCount(responsiveCase.scope === 'focused' ? 2 : 4);
    await expect(page.locator('.au-metric > small')).toContainText(['trials']);
    const metricEvidence = await page.locator('.au-metric').evaluateAll((cards) =>
      cards.map((card) => ({
        copy: card.querySelector(':scope > p')?.textContent?.trim() ?? '',
        detail: card.querySelector(':scope > small')?.textContent?.trim() ?? '',
        value: card.querySelector(':scope > strong')?.textContent?.trim() ?? '',
      })),
    );
    expect(
      metricEvidence.every(({ copy, detail, value }) => copy && detail && value),
      `${label} should show a value, run evidence, and interpretation for every result metric`,
    ).toBe(true);
    await expect(page.locator('.au-results__stamp')).toHaveClass(/is-limited/);
    await expect(page.locator('.au-results__stamp')).toContainText('Upper run boundary');
    await expect(page.locator('.au-results__stamp')).toContainText('Interpret with caution');
    await expect(page.locator('.au-results__stamp strong')).toHaveText(
      await page.locator('.au-metric').nth(1).locator(':scope > strong').innerText(),
    );
    await expect(page.getByText(/Device-relative, never dB HL/i)).toBeVisible();
  }
});

test('caution copies retain controls, interruptions, context, and visible journal failure', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Clipboard and malformed-storage simulation');
  await page.addInitScript(
    (configuration) => {
      window.__SENSE6_TEST_CONFIG__ = configuration;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText(text) {
            window.__uditoCopiedText = text;
            return Promise.resolve();
          },
        },
      });
    },
    {
      udito: {
        feedbackMs: 2,
        audio: { toneMs: 8, gapMs: 4, rampMs: 1, referenceMs: 18 },
        headphones: { practiceTrials: 1, scoredTrials: 1, passCorrect: 1 },
        range: { targetReversals: 0, minTrials: 1, maxTrials: 1, controlAt: [0] },
        pitch: { targetReversals: 0, minTrials: 1, maxTrials: 1 },
      },
    },
  );
  await page.goto('/en/udito/');
  await page.evaluate(() => localStorage.setItem('sense6:journal', '{malformed'));
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await completeUditoSetup(page);
  await page.getByRole('button', { name: /Begin selected scope/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Begin headphone check/i }).click();
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Continue to Portata/i }).click();
  await page.getByRole('button', { name: /Start Portata/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
  const controlCorrect = Number(await page.locator('[data-au-runner]').getAttribute('data-correct-interval'));
  await page.locator(`[data-au-response="${(controlCorrect + 1) % 3}"]`).click();
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Continue to Intonazione/i }).click();
  await page.getByRole('button', { name: /Start Intonazione/i }).click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Yes, unchanged/i }).click();

  await expect(page.getByRole('alert')).toContainText(/Journal entry not saved/i);
  await expect(page.getByRole('alert')).toContainText(/can still be copied/i);
  await page.getByRole('button', { name: /Copy result summary/i }).click();
  await expect
    .poll(() => page.evaluate(() => window.__uditoCopiedText ?? ''))
    .toContain('Run quality: Interpret with caution');
  const copied = await page.evaluate(() => window.__uditoCopiedText);
  expect(copied).toContain('Portata control accuracy: 0% (1/1 controls)');
  expect(copied).toContain('Playback interruptions: 0');
  expect(copied).toContain('Setup: Over-ear / on-ear; Other / unsure;');
  expect(copied).toContain('Interpret with caution: Portata control accuracy was 0%');
  expect(copied).toContain('not dB HL');
});

test('offline rendering confirms the setup reference bounds later representative tones', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'OfflineAudioContext is browser-backed');
  await page.goto('/en/udito/');
  const levels = await page.evaluate(async () => {
    const { HEARING_DIGITAL_LEVELS } = await import('/src/lib/hearing.js');
    const render = async (gainValue) => {
      const sampleRate = 44100;
      const seconds = 0.5;
      const context = new OfflineAudioContext(1, sampleRate * seconds, sampleRate);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 1000;
      gain.gain.value = gainValue;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(0);
      oscillator.stop(seconds);
      const rendered = await context.startRendering();
      const samples = rendered.getChannelData(0);
      const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
      const peak = samples.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
      return { rms, peak };
    };
    const reference = await render(HEARING_DIGITAL_LEVELS.reference);
    const later = await Promise.all([
      render(HEARING_DIGITAL_LEVELS.headphones),
      render(HEARING_DIGITAL_LEVELS.range),
      render(HEARING_DIGITAL_LEVELS.pitchBase * 10 ** (HEARING_DIGITAL_LEVELS.pitchRoveMaxDb / 20)),
    ]);
    return { reference, later };
  });
  for (const stimulus of levels.later) {
    expect(stimulus.rms).toBeLessThanOrEqual(levels.reference.rms);
    expect(stimulus.peak).toBeLessThanOrEqual(levels.reference.peak);
  }
});

async function setDocumentHidden(page, hidden) {
  await page.evaluate((nextHidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => nextHidden });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

async function expectUditoGeometry(page, label, { runner = false } = {}) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    if (
      document.documentElement.scrollWidth <= viewportWidth + 1 &&
      document.body.scrollWidth <= viewportWidth + 1
    )
      return [];
    return [...document.querySelectorAll('#app *')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left < -1 || rect.right > viewportWidth + 1 || element.scrollWidth > element.clientWidth + 1
        );
      })
      .map((element) => `${element.tagName.toLowerCase()}.${element.className || '(no-class)'}`)
      .slice(0, 12);
  });
  expect(overflow, `${label} should not overflow horizontally`).toEqual([]);

  const splitWords = await page.evaluate(() => {
    const root = document.querySelector('#app');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const offenders = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || parent.closest('.sr-only') || getComputedStyle(parent).display === 'none') continue;
      for (const match of node.data.matchAll(/[\p{L}\p{N}][\p{L}\p{N}-]{5,}/gu)) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const fragments = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
        if (fragments.length > 3) offenders.push(`${match[0]} (${fragments.length} lines)`);
      }
    }
    return offenders;
  });
  expect(splitWords, `${label} should not render words as vertical letter columns`).toEqual([]);

  if (!runner) return;
  const stop = page.locator('[data-action="au-stop"]');
  const stopBox = await stop.boundingBox();
  expect(stopBox?.width ?? 0, `${label} stop width`).toBeGreaterThanOrEqual(44);
  expect(stopBox?.height ?? 0, `${label} stop height`).toBeGreaterThanOrEqual(44);
  for (const response of await page.locator('[data-au-response]').all()) {
    await response.scrollIntoViewIfNeeded();
    const box = await response.boundingBox();
    expect(box?.x ?? -1, `${label} response left edge`).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0), `${label} response right edge`).toBeLessThanOrEqual(
      await page.evaluate(() => innerWidth + 1),
    );
    expect(box?.height ?? 0, `${label} response height`).toBeGreaterThanOrEqual(44);
    const hit = await response.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const listening = document.querySelector('.au-listening').getBoundingClientRect();
      const centreX = rect.left + rect.width / 2;
      const centreY = rect.top + rect.height / 2;
      return {
        centreY,
        hit: element.contains(document.elementFromPoint(centreX, centreY)),
        listening: { bottom: listening.bottom, top: listening.top },
        rect: { bottom: rect.bottom, top: rect.top },
      };
    });
    expect(hit.hit, `${label} response should receive a centre-point hit test: ${JSON.stringify(hit)}`).toBe(
      true,
    );
  }
}
