import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * An approval is a PR-scoped decision, not a permanent exemption.
 * Inherited declarations must neither excuse nor fail future changes.
 * A newly added line or a changed rationale explicitly re-approves a capture.
 *
 * @param {string} source
 */
export function parseVisualApprovals(source) {
  const result = new Map();
  for (const [i, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([a-z0-9][a-z0-9-]*-(?:desktop|mobile)-chromium-linux\.png)\s+#\s+(.+)$/.exec(line);
    if (!match) {
      throw new Error(`Invalid visual approval at line ${i + 1}: expected a screenshot name and reason`);
    }
    const [, name, reason] = match;
    if (result.has(name)) throw new Error(`Duplicate visual approval: ${name}`);
    result.set(name, reason.trim().replace(/\s+/g, ' '));
  }
  return result;
}

/**
 * Only new or re-justified approvals may authorize an intentional difference.
 * The visual suite still compares every representative screenshot.
 * @param {string} baseSource
 * @param {string} candidateSource
 */
export function newVisualApprovals(baseSource, candidateSource) {
  const base = parseVisualApprovals(baseSource);
  const candidate = parseVisualApprovals(candidateSource);
  return [...candidate].filter(([name, reason]) => base.get(name) !== reason).map(([name]) => name);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sha = process.argv[2];
  if (!/^[a-f0-9]{40}$/i.test(sha ?? '')) {
    throw new Error('Pass a verified 40-character base commit SHA for visual approvals');
  }
  const base = execFileSync('git', ['show', `${sha}:audits/visual-baseline-approvals.txt`], {
    encoding: 'utf8',
  });
  const candidate = readFileSync('audits/visual-baseline-approvals.txt', 'utf8');
  const current = newVisualApprovals(base, candidate);
  console.log(current.join(','));
  console.error(`New visual approvals in current revision: ${current.length}`);
}
