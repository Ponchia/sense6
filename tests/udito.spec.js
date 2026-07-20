import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  answerCurrentSoundTrial,
  captureMetrics,
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
  await expect(page.locator('.au-research .source-list li')).toHaveCount(4);
  await expect(page.locator('.au-closing').getByRole('button', { name: /Open test/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  await page.getByRole('button', { name: /See the method/i }).click();
  await expect(page.getByRole('heading', { name: /Three questions. No synthetic score/i })).toBeInViewport();

  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page.locator('.experiment-boundary')).toHaveText(
    /recreational experiment for curiosity and fun—not a medical test or diagnosis/i,
  );
  const start = page.getByRole('button', { name: /Begin instrument 01/i });
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: /Play maximum-level reference/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  await expect(start).toBeEnabled();
  await page.getByLabel('Connection').selectOption('wireless');
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: /Play reference again/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
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
  await page.getByRole('button', { name: /Open private journal/i }).click();
  await expect(page).toHaveURL(/\/en\/journal\/$/);
  await expect(page.getByRole('heading', { name: /Your private measurement journal/i })).toBeVisible();
});

test('German Udito stages localize generated listening labels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser locale journey');
  await installQuickUdito(page);
  await page.goto('/de/udito/');
  await page.locator('[data-action="au-setup"]').click();
  await page.locator('[data-action="au-reference"]').click();
  await expect(page.locator('[data-au-reference-status]')).toContainText(
    'Referenz nach Audiouhr abgeschlossen',
  );
  await page.locator('[data-au-consent]').check();
  await page.locator('[data-action="au-start"]').click();
  await expect(page.locator('.au-brief__copy')).toContainText('Kopfhörer-Konfidenz');
  await expect(page.getByRole('heading', { name: 'Welcher Ton ist am leisesten?' })).toBeVisible();
  await page.locator('[data-action="au-begin-stage"]').click();
  await expect(page.getByRole('heading', { name: 'Hörtest für Cuffie' })).toBeAttached();
  await expect(page.locator('.au-runner__header strong')).toHaveText('Übung');
});

test('the mobile Udito setup and listening runner stay inside the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await installQuickUdito(page);
  await page.goto('/en/udito/');
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await page.getByRole('button', { name: /Play maximum-level reference/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  await page.getByRole('button', { name: /Begin instrument 01/i }).click();
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
  const start = page.getByRole('button', { name: /Begin instrument 01/i });
  await page.getByRole('button', { name: /Play maximum-level reference/i }).click();
  await page.waitForTimeout(90);
  await page.evaluate(() => window.__trackedUditoAudioContext.suspend());
  await expect(page.getByText(/reference did not complete on the audio clock/i)).toBeVisible();
  await expect(start).toBeDisabled();

  await page.getByRole('button', { name: /Play reference again/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
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
  await page.getByRole('button', { name: /Play maximum-level reference/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  await page.getByRole('button', { name: /Begin instrument 01/i }).click();
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
  await page.getByRole('button', { name: /Play maximum-level reference/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  await page.getByRole('button', { name: /Begin instrument 01/i }).click();
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
  await page.getByRole('button', { name: /Play maximum-level reference/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  await page.getByRole('button', { name: /Begin instrument 01/i }).click();
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
