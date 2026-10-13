import { expect, test } from '@playwright/test';
import { findOverfragmentedWords } from './helpers/geometry.js';

test('word-fragment inspection detects broken words in nested and direct text @pr-smoke', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One browser exercises the geometry assertion itself');
  await page.setContent(`
    <style>
      #app { font: 16px/20px monospace; width: 9px; overflow-wrap: anywhere; }
      .sr-only { display: block; }
    </style>
    <main id="app">headphones<section>calibration<span>responsive</span></section>
      <span class="sr-only">announcement</span><span style="display:none">invisible</span>
    </main>`);
  const root = page.locator('#app');
  const broken = await root.evaluate(findOverfragmentedWords);
  expect(broken.map((word) => word.split(' ')[0])).toEqual(['headphones', 'calibration', 'responsive']);
  await root.evaluate((element) => {
    element.style.width = '800px';
  });
  expect(await root.evaluate(findOverfragmentedWords)).toEqual([]);

  // Several range rectangles can share a line (for example a hyphen). The
  // inspection must not call them separate lines, nor miss genuine wrapping.
  await page.evaluate(() => {
    const createRange = document.createRange.bind(document);
    document.createRange = () => {
      const range = createRange();
      const getRects = range.getClientRects.bind(range);
      range.getClientRects = () => [...getRects()].flatMap((rect) => [rect, rect, rect, rect]);
      return range;
    };
  });
  expect(await root.evaluate(findOverfragmentedWords)).toEqual([]);
  await root.evaluate((element) => {
    element.style.width = '9px';
  });
  expect((await root.evaluate(findOverfragmentedWords)).map((word) => word.split(' ')[0])).toEqual([
    'headphones',
    'calibration',
    'responsive',
  ]);
});
