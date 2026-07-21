import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { EXAMS } from '../src/exams/registry.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(ROOT, 'public', 'social');
const CARDS = [
  {
    id: 'sense6',
    accent: '#8357ff',
    eyebrow: 'PRIVATE BROWSER PERCEPTION LAB',
    title: 'Sense6',
    copy: 'COLOUR · RESPONSE · HEARING · SHARPNESS',
    glyph: '6',
  },
  {
    id: 'tetracromia',
    accent: '#ff4d8d',
    eyebrow: 'TETRACROMIA',
    title: 'Screen Colour Lab',
    copy: 'THREE SHORT COLOUR OBSERVATIONS',
    glyph: 'ΔE',
  },
  {
    id: 'color-blindness',
    accent: '#3bd6a2',
    eyebrow: 'DALTONIA',
    title: 'Colour-vision experiment',
    copy: 'THREE DISPLAY-RELATIVE ADAPTIVE TRACKS',
    glyph: 'C',
  },
  {
    id: 'riflessi',
    accent: '#f4b942',
    eyebrow: 'RIFLESSI',
    title: 'Response timing',
    copy: 'SPEED · CHOICE · WITHIN-RUN CONSISTENCY',
    glyph: 'R',
  },
  {
    id: 'udito',
    accent: '#4cc9f0',
    eyebrow: 'UDITO',
    title: 'Listening experiment',
    copy: 'HEADPHONES · AUDIBILITY · PITCH',
    glyph: 'U',
  },
  {
    id: 'acutezza',
    accent: '#9b78ff',
    eyebrow: 'ACUTEZZA',
    title: 'Calibrated sharpness',
    copy: 'ANGULAR DETAIL · NOMINAL CONTRAST',
    glyph: 'A',
  },
];

const expectedCardIds = ['sense6', ...EXAMS.map(({ id }) => id)].sort();
const cardIds = CARDS.map(({ id }) => id).sort();
if (JSON.stringify(cardIds) !== JSON.stringify(expectedCardIds)) {
  throw new Error(
    `Social-card registry drift: expected ${expectedCardIds.join(', ')}, found ${cardIds.join(', ')}`,
  );
}

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const card of CARDS) {
    const svg = cardSvg(card);
    await writeFile(join(OUTPUT, `${card.id}.svg`), svg);
    await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
    await page.locator('svg').screenshot({ path: join(OUTPUT, `${card.id}.png`) });
  }
} finally {
  await browser.close();
}

function cardSvg({ accent, eyebrow, title, copy, glyph }) {
  const dots = Array.from(
    { length: 34 },
    (_, index) =>
      `<circle cx="${760 + (index % 7) * 62}" cy="${84 + Math.floor(index / 7) * 82}" r="${8 + (index % 4) * 3}" fill="${accent}" opacity="${0.15 + (index % 5) * 0.08}"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img">
    <title>${escapeXml(`${eyebrow} — ${title}`)}</title>
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#11131a"/><stop offset="1" stop-color="#202433"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".38"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="970" cy="310" r="340" fill="url(#glow)"/>
    ${dots}
    <circle cx="950" cy="315" r="184" fill="none" stroke="${accent}" stroke-width="2" opacity=".65"/>
    <circle cx="950" cy="315" r="130" fill="#151820" stroke="${accent}" stroke-width="8"/>
    <text x="950" y="348" text-anchor="middle" fill="#f6f7fb" font-family="Arial, sans-serif" font-size="92" font-weight="700">${escapeXml(glyph)}</text>
    <text x="74" y="92" fill="${accent}" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="5">${escapeXml(eyebrow)}</text>
    <text x="72" y="250" fill="#f6f7fb" font-family="Arial, sans-serif" font-size="74" font-weight="700" letter-spacing="-2">${escapeXml(title)}</text>
    <rect x="74" y="298" width="108" height="8" rx="4" fill="${accent}"/>
    <text x="74" y="365" fill="#c9cedd" font-family="Arial, sans-serif" font-size="22" font-weight="600" letter-spacing="2">${escapeXml(copy)}</text>
    <text x="74" y="548" fill="#f6f7fb" font-family="Arial, sans-serif" font-size="28" font-weight="700">Sense<tspan fill="${accent}">6</tspan></text>
    <text x="176" y="548" fill="#8f96aa" font-family="Arial, sans-serif" font-size="18">sense6.net</text>
  </svg>`;
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
