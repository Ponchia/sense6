import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { writeThirdPartyNotices } from '../scripts/write-third-party-notices.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const UI = join(ROOT, 'node_modules', '@ponchia', 'ui');

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'sense6-third-party-notices-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const ui = join(root, 'node_modules', '@ponchia', 'ui');
  await mkdir(join(ui, 'fonts'), { recursive: true });
  await mkdir(join(root, 'dist', 'assets'), { recursive: true });
  const metadata = JSON.parse(await readFile(join(UI, 'package.json'), 'utf8'));
  const project = { license: 'MIT', dependencies: { '@ponchia/ui': metadata.version } };
  const lock = { packages: { 'node_modules/@ponchia/ui': { version: metadata.version } } };
  const notices = {
    project: await readFile(join(ROOT, 'LICENSE'), 'utf8'),
    // Preserve source line endings too; generation must not rewrite legal text.
    ui: (await readFile(join(UI, 'LICENSE'), 'utf8')).replaceAll('\n', '\r\n'),
    doto: await readFile(join(UI, 'fonts', 'OFL.txt'), 'utf8'),
  };
  await Promise.all([
    writeFile(join(root, 'package.json'), JSON.stringify(project)),
    writeFile(join(root, 'package-lock.json'), JSON.stringify(lock)),
    writeFile(join(ui, 'package.json'), JSON.stringify(metadata)),
    writeFile(join(root, 'LICENSE'), notices.project),
    writeFile(join(ui, 'LICENSE'), notices.ui),
    writeFile(join(ui, 'fonts', 'OFL.txt'), notices.doto),
    ...[400, 500, 600, 700, 800, 900].map(async (weight) => {
      const name = `doto-${weight}.woff2`;
      await writeFile(join(ui, 'fonts', name), await readFile(join(UI, 'fonts', name)));
    }),
  ]);
  for (const weight of [400, 800]) {
    await writeFile(
      join(root, 'dist', 'assets', `renamed-font-${weight}.woff2`),
      await readFile(join(UI, 'fonts', `doto-${weight}.woff2`)),
    );
  }
  return { root, ui, notices, project, lock, metadata };
}

test('built notices preserve exact source licenses and only list fonts that were emitted', async (t) => {
  const { root, notices, metadata } = await fixture(t);
  const { output, fonts } = await writeThirdPartyNotices(root);
  const content = await readFile(output, 'utf8');
  assert.ok(content.includes(notices.project));
  assert.ok(content.includes(notices.ui));
  assert.ok(content.includes(notices.doto));
  assert.ok(content.includes(`@ponchia/ui ${metadata.version}`));
  assert.deepEqual(fonts, ['assets/renamed-font-400.woff2', 'assets/renamed-font-800.woff2']);
  assert.ok(!content.includes(root));
  assert.ok(!content.includes('Inter'));
  assert.ok(!content.includes('JetBrains'));
  await writeThirdPartyNotices(root);
  assert.equal(await readFile(output, 'utf8'), content);
});

test('a missing source notice stops the build before it creates a license artifact', async (t) => {
  const { root, ui } = await fixture(t);
  await rm(join(ui, 'fonts', 'OFL.txt'));
  await assert.rejects(writeThirdPartyNotices(root), { code: 'ENOENT' });
  await assert.rejects(readFile(join(root, 'dist', 'third-party-notices.txt')), { code: 'ENOENT' });
});

test('font attribution is checked by content, not a plausible filename', async (t) => {
  const { root } = await fixture(t);
  await writeFile(join(root, 'dist', 'assets', 'doto-400-fake.woff2'), 'different font bytes');
  await assert.rejects(writeThirdPartyNotices(root), /Unreviewed emitted font/);
});

test('a missing font build cannot produce an apparently complete notice', async (t) => {
  const { root } = await fixture(t);
  await rm(join(root, 'dist', 'assets'), { recursive: true });
  await assert.rejects(writeThirdPartyNotices(root), /No emitted fonts found/);
});

test('a new runtime dependency requires an attribution review', async (t) => {
  const { root, project } = await fixture(t);
  project.dependencies['new-runtime'] = '1.0.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(project));
  await assert.rejects(writeThirdPartyNotices(root), /Runtime dependencies changed/);
});

test('license and installed-version drift cannot silently reuse the old inventory', async (t) => {
  const { root, ui, metadata, lock } = await fixture(t);
  await writeFile(join(ui, 'package.json'), JSON.stringify({ ...metadata, license: 'ISC' }));
  await assert.rejects(writeThirdPartyNotices(root), /Package license metadata changed/);
  await writeFile(join(ui, 'package.json'), JSON.stringify(metadata));
  lock.packages['node_modules/@ponchia/ui'].version = '0.0.0';
  await writeFile(join(root, 'package-lock.json'), JSON.stringify(lock));
  await assert.rejects(writeThirdPartyNotices(root), /does not match the lockfile/);
});
