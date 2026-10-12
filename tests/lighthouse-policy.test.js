import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { SEARCH_REPRESENTATIVE_ROUTES } from '../audits/routes.js';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const expectedOrigin = 'http://127.0.0.1:4174';

function verifyFixture(change = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'sense6-lighthouse-'));
  try {
    const reports = join(root, 'reports');
    for (const [index, route] of SEARCH_REPRESENTATIVE_ROUTES.entries()) {
      const report = {
        finalDisplayedUrl: `${expectedOrigin}${route}`,
        categories: {
          performance: { score: 0.9 },
          accessibility: { score: 1 },
          'best-practices': { score: 1 },
          seo: { score: 1 },
        },
        audits: {
          'cumulative-layout-shift': { numericValue: 0.1 },
          'largest-contentful-paint': { numericValue: 2500 },
          'total-blocking-time': { numericValue: 200 },
        },
      };
      change(report, index);
      const dir = join(reports, `route-${index}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'lighthouse.json'), JSON.stringify(report));
    }
    return spawnSync(process.execPath, ['scripts/check-lighthouse-metrics.mjs'], {
      cwd: resolve(projectRoot),
      encoding: 'utf8',
      env: {
        ...process.env,
        FULL_SITE_AUDIT: '0',
        LIGHTHOUSE_OUTPUT_PATH: root,
        LIGHTHOUSE_SITE: expectedOrigin,
      },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('Lighthouse category and Core Web Vitals boundaries pass at their exact limits', () => {
  const result = verifyFixture();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed for 16 routes/);
});

test('Lighthouse policy fails closed on an insufficient category score', () => {
  const result = verifyFixture((report, index) => {
    if (index === 0) report.categories.performance.score = 0.89;
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /performance 89 below 90/);
});

test('Lighthouse policy fails closed on excessive total blocking time', () => {
  const result = verifyFixture((report, index) => {
    if (index === 0) report.audits['total-blocking-time'].numericValue = 201;
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TBT 201ms exceeds 200ms/);
});

test('Lighthouse policy detects duplicated and missing route identities', () => {
  const result = verifyFixture((report, index) => {
    if (index === 1) report.finalDisplayedUrl = `${expectedOrigin}/`;
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /repeated audit report for one route/);
  assert.match(result.stderr, /required audit report is missing/);
});

test('Lighthouse policy rejects a report from another origin', () => {
  const result = verifyFixture((report, index) => {
    if (index === 0) report.finalDisplayedUrl = 'https://unrelated.example/';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /outside the audited Sense6 preview origin/);
});
