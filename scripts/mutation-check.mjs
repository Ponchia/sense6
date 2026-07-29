#!/usr/bin/env node
/**
 * Mutation check for the shared `src/lib` modules.
 *
 * Coverage percentages say a line ran, not that anything asserted its result.
 * This harness edits one operator or literal at a time and re-runs the unit
 * suite. A mutant that SURVIVES is a line the suite executes but does not
 * check — either a missing assertion or an equivalent mutant that cannot change
 * behaviour. Both need a human decision, so survivors are reported, never
 * auto-failed.
 *
 * Deliberately NOT part of `check:core`: a full sweep is minutes of wall clock
 * because it re-runs the suite once per mutant. Run it when changing a shared
 * module or when a coverage number looks better than the assertions justify.
 *
 * Usage:
 *   node scripts/mutation-check.mjs                        # every src/lib module
 *   node scripts/mutation-check.mjs src/lib/hearing.js     # one module
 *   node scripts/mutation-check.mjs --list src/lib/hearing.js
 *   node scripts/mutation-check.mjs --test 'node --test tests/hearing.test.js' src/lib/hearing.js
 *
 * How it works, and the caveat that follows from it: the harness rewrites the
 * real file in place, runs the suite, and restores the original from memory in a
 * `finally` and on SIGINT/SIGTERM. To make a crash recoverable it refuses to run
 * against a target with uncommitted changes, so `git checkout -- <file>` is
 * always a valid recovery. Mutation is textual, and it skips comment lines, so a
 * few mutants land in places a parser-based tool would not pick. Read the
 * reported line before acting on it.
 */
import { execFile } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TEST_TIMEOUT_MS = 120_000;

/**
 * Textual mutation operators. Each entry finds candidate sites on a line and
 * rewrites one occurrence. Patterns are written to avoid arrow functions (`=>`)
 * and compound assignment, which are not comparisons.
 *
 * @type {ReadonlyArray<{ name: string, pattern: RegExp, replace: string }>}
 */
const OPERATORS = Object.freeze([
  { name: 'true->false', pattern: /(?<![!=<>])=\s*true\b/g, replace: '= false' },
  { name: 'false->true', pattern: /(?<![!=<>])=\s*false\b/g, replace: '= true' },
  { name: '>=->>', pattern: />=/g, replace: '>' },
  { name: '<=-><', pattern: /(?<!=)<=/g, replace: '<' },
  { name: '>->>=', pattern: /(?<![-=>])>(?!=)/g, replace: '>=' },
  { name: '<-><=', pattern: /(?<![<=])<(?!=)/g, replace: '<=' },
  { name: '===->!==', pattern: /===/g, replace: '!==' },
  { name: '!==->===', pattern: /!==/g, replace: '===' },
  { name: '&&->||', pattern: /&&/g, replace: '||' },
  { name: '||->&&', pattern: /\|\|/g, replace: '&&' },
  { name: '??->||', pattern: /\?\?(?!=)/g, replace: '||' },
]);

/** Lines that are documentation rather than behaviour. */
function isComment(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/**
 * Enumerate every mutant of one file as `{ line, column, operator, mutated }`,
 * where `mutated` is the full replacement source.
 */
function enumerateMutants(source) {
  const lines = source.split('\n');
  const mutants = [];
  lines.forEach((line, index) => {
    if (isComment(line)) return;
    for (const { name, pattern, replace } of OPERATORS) {
      for (const match of [...line.matchAll(pattern)]) {
        const at = match.index ?? 0;
        const rewritten =
          line.slice(0, at) + match[0].replace(pattern, replace) + line.slice(at + match[0].length);
        if (rewritten === line) continue;
        const mutatedLines = [...lines];
        mutatedLines[index] = rewritten;
        mutants.push({
          line: index + 1,
          operator: name,
          original: line.trim(),
          rewritten: rewritten.trim(),
          mutated: mutatedLines.join('\n'),
        });
      }
    }
  });
  return mutants;
}

async function isDirty(file) {
  const { stdout } = await run('git', ['status', '--porcelain', '--', file], { cwd: ROOT });
  return stdout.trim().length > 0;
}

const DEFAULT_TEST_COMMAND = 'node --test tests/*.test.js';

/** @param {string[]} args */
function parseArgs(args) {
  const testIndex = args.indexOf('--test');
  return {
    listOnly: args.includes('--list'),
    testCommand: testIndex === -1 ? DEFAULT_TEST_COMMAND : (args[testIndex + 1] ?? DEFAULT_TEST_COMMAND),
    targets: args.filter(
      (arg, index) => !arg.startsWith('--') && index !== testIndex + 1 && arg.endsWith('.js'),
    ),
  };
}

/** @param {string[]} targets */
async function resolveFiles(targets) {
  if (targets.length) return targets;
  const names = await readdir(new URL('../src/lib/', import.meta.url));
  return names
    .filter((name) => name.endsWith('.js'))
    .map((name) => `src/lib/${name}`)
    .sort();
}

/** Run one mutant and classify it. */
async function classify(testCommand) {
  try {
    await run('sh', ['-c', testCommand], { cwd: ROOT, timeout: TEST_TIMEOUT_MS });
    return 'SURVIVED';
  } catch (error) {
    return error.killed ? 'TIMEOUT' : 'KILLED';
  }
}

/**
 * Sweep every mutant of one file, restoring the original before returning.
 *
 * @returns {Promise<{ total: number, killed: number, timedOut: number, survivors: string[] }>}
 */
async function sweepFile(file, mutants, testCommand) {
  const tally = { total: 0, killed: 0, timedOut: 0, survivors: /** @type {string[]} */ ([]) };
  const target = new URL(file, `file://${ROOT}`);
  const original = await readFile(target, 'utf8');
  const onSignal = () => {
    writeFile(target, original).finally(() => exit(130));
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    for (const mutant of mutants) {
      await writeFile(target, mutant.mutated);
      tally.total += 1;
      const status = await classify(testCommand);
      if (status === 'KILLED') tally.killed += 1;
      else if (status === 'TIMEOUT') tally.timedOut += 1;
      else
        tally.survivors.push(
          `${file}:${mutant.line} [${mutant.operator}] ${mutant.original} -> ${mutant.rewritten}`,
        );
      console.log(`  L${String(mutant.line).padEnd(4)} ${mutant.operator.padEnd(12)} ${status}`);
    }
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    await writeFile(target, original);
  }
  return tally;
}

/** @param {{ total: number, killed: number, timedOut: number, survivors: string[] }} tally */
function report(tally) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(
    `mutants ${tally.total} · killed ${tally.killed} · timed out ${tally.timedOut} · survived ${tally.survivors.length}`,
  );
  if (tally.timedOut) {
    console.log('\nA TIMEOUT is a mutant that made the suite hang — usually a broken loop exit.');
    console.log('Treat it as detected, but prefer a test that fails fast over one that hangs.');
  }
  if (!tally.survivors.length) return;
  console.log('\nSurvivors — each is a line the suite runs without checking its result:');
  for (const survivor of tally.survivors) console.log(`  ${survivor}`);
  console.log('\nFor each one, decide which it is and record the decision:');
  console.log('  * a missing assertion  -> add the test, then re-run and confirm it is KILLED;');
  console.log('  * an equivalent mutant -> the change cannot alter observable behaviour.');
  console.log('Do not assume the second without checking the first; "all survivors are');
  console.log('equivalent" is a claim that needs per-mutant evidence, and it has been wrong.');
}

async function main() {
  const { listOnly, testCommand, targets } = parseArgs(argv.slice(2));
  const files = await resolveFiles(targets);
  const tally = { total: 0, killed: 0, timedOut: 0, survivors: /** @type {string[]} */ ([]) };

  for (const file of files) {
    const mutants = enumerateMutants(await readFile(new URL(file, `file://${ROOT}`), 'utf8'));
    console.log(`\n${file}: ${mutants.length} mutants`);
    if (listOnly) {
      for (const mutant of mutants) console.log(`  L${mutant.line} ${mutant.operator}: ${mutant.rewritten}`);
      continue;
    }
    if (await isDirty(file)) {
      console.log(
        `  SKIPPED: ${file} has uncommitted changes; commit or stash so a crash stays recoverable.`,
      );
      continue;
    }
    const result = await sweepFile(file, mutants, testCommand);
    tally.total += result.total;
    tally.killed += result.killed;
    tally.timedOut += result.timedOut;
    tally.survivors.push(...result.survivors);
  }

  if (listOnly) return;
  report(tally);
  // Reporting tool, not a gate: survivors never set a failing exit code.
  exit(0);
}

await main();
