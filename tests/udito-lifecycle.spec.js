import { expect, test } from '@playwright/test';
import { answerCurrentSoundTrial, completeUditoSetup, installQuickUdito } from './helpers/browser.js';

for (const change of ['selection', 'output']) {
  test(`Udito discards a pending reference after an audio ${change} change @pr-smoke`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Controlled audio completion and output-change simulation',
    );
    await installQuickUdito(page);
    await page.goto('/en/udito/');
    await page.locator('[data-action="au-setup"]').click();
    await page.evaluate(async () => {
      const { HearingAudio } = await import('/src/lib/hearing-audio.js');
      const original = HearingAudio.prototype.playReference;
      window.__restoreUditoReference = () => {
        HearingAudio.prototype.playReference = original;
      };
      HearingAudio.prototype.playReference = async function () {
        await this.init();
        return new Promise((resolve) => {
          window.__completeUditoReference = resolve;
        });
      };
    });
    await page.locator('[data-action="au-reference"]').click();
    await expect.poll(() => page.evaluate(() => typeof window.__completeUditoReference)).toBe('function');

    if (change === 'selection') await page.locator('[data-au-connection]').selectOption('wireless');
    else await page.evaluate(() => navigator.mediaDevices.dispatchEvent(new Event('devicechange')));
    await page.evaluate(async () => {
      window.__completeUditoReference(true);
      await new Promise(requestAnimationFrame);
    });

    await expect(page.locator('[data-au-reference-status]')).toContainText(
      change === 'selection' ? 'The listening setup changed.' : 'The available audio outputs changed.',
    );
    await expect(page.locator('[data-au-anchors-confirmed]')).toBeDisabled();
    await expect(page.locator('[data-action="au-start"]')).toBeDisabled();
    await expect(page.locator('[data-action="au-reference"]')).toHaveText('Play reference again');
    await expect(page.locator('[data-action="au-reference"]')).toBeEnabled();
    await page.evaluate(() => window.__restoreUditoReference());
    await completeUditoSetup(page);
    await expect(page.locator('[data-action="au-start"]')).toBeEnabled();
  });
}

for (const transport of ['clipboard', 'share']) {
  test(`Udito discards old ${transport} feedback when repeating a completed run @pr-smoke`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Controlled result-sharing completion');
    await installQuickUdito(page);
    await page.addInitScript((transport) => {
      window.__uditoPendingShares = [];
      const defer = () =>
        new Promise((resolve, reject) => window.__uditoPendingShares.push({ resolve, reject }));
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: transport === 'share' ? defer : undefined,
      });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: defer },
      });
    }, transport);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await finishFocusedRun(page);
    await page.locator('[data-action="au-copy"]').click();
    await page.locator('[data-action="au-copy"]').click();
    await expect.poll(() => page.evaluate(() => window.__uditoPendingShares.length)).toBe(2);
    await page.locator('[data-action="au-restart"]').click();
    await expect(page.locator('[data-action="au-reference"]')).toBeVisible();
    await page.evaluate(async () => {
      window.__uditoPendingShares[0].resolve();
      window.__uditoPendingShares[1].reject(new Error('Deferred sharing failure'));
      await new Promise(requestAnimationFrame);
    });
    await expect(page.locator('.ui-toast-stack')).toHaveCount(0);
    await expect(page.locator('[data-action="au-start"]')).toBeDisabled();
    expect(pageErrors).toEqual([]);
  });
}

async function finishFocusedRun(page) {
  await page.goto('/en/udito/');
  await page.locator('[data-action="au-setup"]').click();
  await page.locator('[data-action="au-scope"][data-scope="focused"]').click();
  await completeUditoSetup(page);
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
  await page.locator('[data-action="au-volume-check"][data-volume-consistent="true"]').click();
  await expect(page.locator('.au-results')).toBeVisible();
}
