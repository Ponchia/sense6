/**
 * Per-module coverage floors for every file in the `test:coverage` include set.
 *
 * The global `c8 --check-coverage` thresholds are an *aggregate*: one badly
 * covered module hides behind sixteen well-covered ones. This script closes
 * that by holding every module to its own floor, and — more importantly — by
 * refusing to pass when a module in the include set has no floor at all.
 *
 * That last rule is the point. Before 2026-07-29 the coverage command ran
 * without `--all`, so c8 only reported files the test process happened to
 * import: `src/lib/display-geometry.js` and the 277-line
 * `src/lib/hearing-audio.js` were absent from the report entirely rather than
 * scored 0%, and the published 97.76% was computed over a subset. Adding a new
 * untested module could not lower the number. `--all` fixes the measurement;
 * the completeness check below makes it impossible to add a module to
 * `src/lib/` without also declaring the coverage it must hold.
 */
import { readdir, readFile } from 'node:fs/promises';

const REPORT = new URL('../coverage/coverage-summary.json', import.meta.url);
const LIB_DIRECTORY = new URL('../src/lib/', import.meta.url);
const METRICS = Object.freeze(['lines', 'branches', 'functions']);

/**
 * Every module matched by `--include='src/lib/*.js'`, with the floor it must
 * hold. Floors are the truncated measurement at the time they were set, so they
 * act as a ratchet: coverage may rise freely, but it cannot fall back.
 *
 * Adding a module to `src/lib/` without adding it here fails the gate.
 */
const MODULE_FLOORS = Object.freeze({
  'acuity.js': { lines: 97, branches: 92, functions: 96 },
  'color.js': { lines: 100, branches: 100, functions: 100 },
  'daltonism.js': { lines: 96, branches: 81, functions: 84 },
  'display-geometry.js': { lines: 100, branches: 100, functions: 100 },
  'hearing-audio.js': { lines: 100, branches: 96, functions: 100 },
  'hearing.js': { lines: 100, branches: 94, functions: 100 },
  'journal.js': { lines: 97, branches: 80, functions: 97 },
  'lifecycle.js': { lines: 100, branches: 87, functions: 100 },
  'mount-registry.js': { lines: 100, branches: 100, functions: 100 },
  'navigation.js': { lines: 100, branches: 100, functions: 100 },
  'optotypes.js': { lines: 100, branches: 87, functions: 100 },
  'random.js': { lines: 100, branches: 100, functions: 100 },
  'reflexes.js': { lines: 100, branches: 95, functions: 100 },
  'result-sharing.js': { lines: 100, branches: 86, functions: 100 },
  'session.js': { lines: 99, branches: 92, functions: 100 },
  'storage-access.js': { lines: 100, branches: 85, functions: 100 },
  'storage.js': { lines: 93, branches: 88, functions: 100 },
});

/**
 * The weakest floor a new module may declare. A module that cannot meet this is
 * a conversation about testability, not a silently accepted zero.
 */
const MINIMUM_FLOOR = Object.freeze({ lines: 90, branches: 70, functions: 80 });

/**
 * How far a module may drift above its floor before the floor must be raised.
 * This keeps the ratchet honest: coverage that improved by ten points and was
 * never locked in can silently regress back to the old floor.
 */
const MAX_DRIFT = 10;

/** @type {string[]} */
const failures = [];

const modules = (await readdir(LIB_DIRECTORY)).filter((file) => file.endsWith('.js')).sort();

let summary;
try {
  summary = JSON.parse(await readFile(REPORT, 'utf8'));
} catch (error) {
  throw new Error(`Coverage did not produce ${REPORT.pathname}`, { cause: error });
}

// 1. Every module in the include set must declare a floor.
for (const file of modules) {
  if (!(file in MODULE_FLOORS)) {
    failures.push(
      `src/lib/${file} has no coverage floor. Add one to MODULE_FLOORS in ` +
        'scripts/check-coverage-report.mjs (at least ' +
        `${MINIMUM_FLOOR.lines}/${MINIMUM_FLOOR.branches}/${MINIMUM_FLOOR.functions} ` +
        'lines/branches/functions) and write the tests that hold it.',
    );
  }
}

// 2. No floor may name a module that no longer exists.
for (const file of Object.keys(MODULE_FLOORS)) {
  if (!modules.includes(file)) {
    failures.push(`MODULE_FLOORS names src/lib/${file}, which no longer exists. Remove the entry.`);
  }
}

// 3. No floor may be weaker than the declared minimum.
for (const [file, floors] of Object.entries(MODULE_FLOORS)) {
  for (const metric of METRICS) {
    if (floors[metric] < MINIMUM_FLOOR[metric]) {
      failures.push(
        `src/lib/${file} declares a ${metric} floor of ${floors[metric]}%, below the ` +
          `${MINIMUM_FLOOR[metric]}% minimum for this project.`,
      );
    }
  }
}

// 4. Every module must appear in the report, which only holds when the coverage
//    command runs c8 with `--all`.
for (const file of modules) {
  const entry = Object.entries(summary).find(([path]) => path.endsWith(`src/lib/${file}`))?.[1];
  if (!entry) {
    failures.push(
      `src/lib/${file} is missing from the coverage report. The coverage command must ` +
        'run c8 with --all so that unimported modules are scored rather than omitted.',
    );
    continue;
  }

  const floors = MODULE_FLOORS[file];
  if (!floors) continue;

  for (const metric of METRICS) {
    const actual = entry[metric]?.pct;
    if (typeof actual !== 'number') {
      failures.push(`src/lib/${file} reports no ${metric} coverage percentage.`);
    } else if (actual < floors[metric]) {
      failures.push(`src/lib/${file} ${metric} coverage is ${actual}%; the floor is ${floors[metric]}%.`);
    } else if (actual >= floors[metric] + MAX_DRIFT) {
      failures.push(
        `src/lib/${file} ${metric} coverage is ${actual}%, ${MAX_DRIFT} or more points above its ` +
          `${floors[metric]}% floor. Raise the floor to lock the improvement in.`,
      );
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Coverage floors not met:\n  - ${failures.join('\n  - ')}`);
}

console.log(`Coverage report verified · ${modules.length} modules, each against its own floor`);
