import { readFile } from 'node:fs/promises';

const REPORT = new URL('../coverage/coverage-summary.json', import.meta.url);
const CRITICAL_FLOORS = Object.freeze({
  'src/lib/lifecycle.js': { lines: 90, branches: 70, functions: 80 },
  'src/lib/reflexes.js': { lines: 90, branches: 70, functions: 80 },
});

let summary;
try {
  summary = JSON.parse(await readFile(REPORT, 'utf8'));
} catch (error) {
  throw new Error(`Coverage did not produce ${REPORT.pathname}`, { cause: error });
}

for (const [relativePath, floors] of Object.entries(CRITICAL_FLOORS)) {
  const entry = Object.entries(summary).find(([file]) => file.endsWith(relativePath))?.[1];
  if (!entry) throw new Error(`Coverage report is missing critical module ${relativePath}`);
  for (const [metric, floor] of Object.entries(floors)) {
    const actual = entry[metric]?.pct;
    if (typeof actual !== 'number' || actual < floor) {
      throw new Error(`${relativePath} ${metric} coverage is ${actual ?? 'missing'}%; floor is ${floor}%`);
    }
  }
}

console.log(`Coverage report verified · ${Object.keys(CRITICAL_FLOORS).length} critical modules`);
