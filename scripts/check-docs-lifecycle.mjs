import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STRICT = new Set([
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'SECURITY.md',
  'THIRD_PARTY_NOTICES.md',
  'src/learn-locales/README.md',
  'CHANGELOG.md',
  'docs/README.md',
  'docs/adding-an-experiment.md',
  'docs/architecture.md',
  'docs/methodology.md',
  'docs/roadmap.md',
  'docs/product-readiness.md',
  'docs/public-repository-readiness.md',
  'docs/runbooks/cloudflare-pages-release.md',
  'docs/adr/0001-name-and-host-sense6-on-cloudflare-pages.md',
  'docs/adr/0002-store-only-anonymous-daily-product-metrics.md',
  'docs/adr/0003-generate-localized-static-entry-pages.md',
  'docs/adr/0004-store-a-local-structured-measurement-journal.md',
  'docs/adr/0005-continue-with-incremental-typed-javascript.md',
  'docs/adr/0006-add-cookieless-web-analytics-without-test-telemetry.md',
]);
const BROAD = new Set(['docs/research/acutezza.md', 'docs/research/five-test-evidence-and-product-audit.md']);
const BROAD_BASELINE = 2;

const rootMarkdown = (await readdir(ROOT, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => entry.name);
const discovered = [...rootMarkdown, ...(await markdownFiles(join(ROOT, 'docs')))];
const unclassified = discovered.filter((path) => !STRICT.has(path) && !BROAD.has(path));
if (unclassified.length) {
  throw new Error(`Unclassified documentation: ${unclassified.join(', ')}`);
}
if (BROAD.size > BROAD_BASELINE) {
  throw new Error(`Broad documentation audit grew from ${BROAD_BASELINE} to ${BROAD.size} files`);
}

for (const path of STRICT) {
  const content = await readFile(join(ROOT, path), 'utf8');
  if (path.startsWith('docs/') && !content.includes('Lifecycle: current')) {
    throw new Error(`${path} must declare Lifecycle: current`);
  }
  await checkLocalLinks(path, content);
}
for (const path of BROAD) {
  const content = await readFile(join(ROOT, path), 'utf8');
  if (!content.includes('Lifecycle: archive')) {
    throw new Error(`${path} must declare Lifecycle: archive`);
  }
}

console.log(
  `Documentation lifecycle · ${STRICT.size} strict files · ${BROAD.size}/${BROAD_BASELINE} broad files`,
);

async function markdownFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await markdownFiles(absolute)));
    else if (entry.name.endsWith('.md')) output.push(relative(ROOT, absolute));
  }
  return output.sort();
}

async function checkLocalLinks(path, content) {
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue;
    const pathname = target.split('#')[0];
    if (!pathname) continue;
    const absolute = resolve(ROOT, dirname(path), pathname);
    if (!absolute.startsWith(`${ROOT}/`) && absolute !== ROOT) {
      throw new Error(`${path} links outside the repository: ${target}`);
    }
    try {
      await stat(absolute);
    } catch {
      throw new Error(`${path} has a missing local link: ${target}`);
    }
  }
}
