import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SEARCH_REPRESENTATIVE_ROUTES, SEARCH_ROUTES } from '../audits/routes.js';

const output = resolve(process.env.LIGHTHOUSE_OUTPUT_PATH ?? '.lighthouse', 'reports');
const reports = (await walk(output)).filter((file) => file.endsWith('/lighthouse.json'));
const routes = process.env.FULL_SITE_AUDIT === '1' ? SEARCH_ROUTES : SEARCH_REPRESENTATIVE_ROUTES;
const expectedOrigin = new URL(process.env.LIGHTHOUSE_SITE ?? 'http://127.0.0.1:4174').origin;
const observedRoutes = new Set();
if (reports.length !== routes.length) {
  throw new Error(`Expected ${routes.length} Lighthouse reports, found ${reports.length} under ${output}`);
}

const categoryFloors = {
  performance: 90,
  accessibility: 100,
  'best-practices': 100,
  seo: 100,
};

const budgets = {
  'cumulative-layout-shift': { label: 'CLS', maximum: 0.1 },
  'largest-contentful-paint': { label: 'LCP', maximum: 2_500 },
  'total-blocking-time': { label: 'TBT', maximum: 200 },
};
const worst = Object.fromEntries(Object.keys(budgets).map((key) => [key, 0]));
const failures = [];

for (const file of reports) {
  const report = JSON.parse(await readFile(file, 'utf8'));
  const finalURL = new URL(report.finalDisplayedUrl);
  const path = finalURL.pathname;
  if (finalURL.origin !== expectedOrigin) {
    failures.push(`${path}: report URL is outside the audited Sense6 preview origin`);
  }
  if (!routes.includes(path)) {
    failures.push(`${path}: report URL is not an expected indexable route`);
  }
  if (observedRoutes.has(path)) {
    failures.push(`${path}: repeated audit report for one route`);
  }
  observedRoutes.add(path);
  if (report.runtimeError) {
    failures.push(`${path}: Lighthouse runtime error: ${JSON.stringify(report.runtimeError)}`);
  }
  for (const [category, floor] of Object.entries(categoryFloors)) {
    const score = report.categories?.[category]?.score;
    if (!Number.isFinite(score) || score * 100 + 0.0001 < floor) {
      failures.push(
        `${path}: ${category} ${Number.isFinite(score) ? Math.round(score * 100) : 'missing'} below ${floor}`,
      );
    }
  }
  for (const [audit, budget] of Object.entries(budgets)) {
    const value = report.audits[audit]?.numericValue;
    if (!Number.isFinite(value)) {
      failures.push(`${path}: ${budget.label} is missing`);
      continue;
    }
    worst[audit] = Math.max(worst[audit], value);
    if (value > budget.maximum) {
      failures.push(
        `${path}: ${budget.label} ${format(audit, value)} exceeds ${format(audit, budget.maximum)}`,
      );
    }
  }
}

for (const route of routes) {
  if (!observedRoutes.has(route)) failures.push(`${route}: required audit report is missing`);
}

const seen = reports.map((file) => file.split('/').at(-2));
if (new Set(seen).size !== routes.length) {
  failures.push('Lighthouse report slugs are missing or repeated');
}

if (failures.length > 0) {
  throw new Error(
    `Lighthouse metric budgets failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`,
  );
}

console.log(
  `Lighthouse vitals passed for ${reports.length} routes (worst CLS ${format('cumulative-layout-shift', worst['cumulative-layout-shift'])}, LCP ${format('largest-contentful-paint', worst['largest-contentful-paint'])}, TBT ${format('total-blocking-time', worst['total-blocking-time'])}).`,
);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      }),
    )
  ).flat();
}

function format(audit, value) {
  return audit === 'cumulative-layout-shift' ? value.toFixed(3) : `${Math.round(value)}ms`;
}
