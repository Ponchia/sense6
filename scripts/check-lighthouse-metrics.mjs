import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.UNLIGHTHOUSE_OUTPUT_PATH ?? '.unlighthouse', 'reports');
const reports = (await walk(output)).filter((file) => file.endsWith('/lighthouse.json'));
if (reports.length === 0) throw new Error(`No Lighthouse reports found under ${output}`);

const budgets = {
  'cumulative-layout-shift': { label: 'CLS', maximum: 0.1 },
  'largest-contentful-paint': { label: 'LCP', maximum: 2_500 },
  'total-blocking-time': { label: 'TBT', maximum: 200 },
};
const worst = Object.fromEntries(Object.keys(budgets).map((key) => [key, 0]));
const failures = [];

for (const file of reports) {
  const report = JSON.parse(await readFile(file, 'utf8'));
  const path = new URL(report.finalDisplayedUrl).pathname;
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
