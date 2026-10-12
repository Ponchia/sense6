import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { SEARCH_ROUTES } from '../audits/routes.js';
import { changedPublicPaths, indexNowPayload, publicIndexNowKey } from '../scripts/submit-indexnow.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HASH_A = '0'.repeat(32);
const HASH_B = '1'.repeat(32);

test('only real additions and changed indexable content are eligible, not global date changes', () => {
  const previous = {
    '/': { hash: HASH_A, date: '2026-10-11' },
    '/ja/': { hash: HASH_A, date: '2026-10-11' },
    '/en/about/': { hash: HASH_A, date: '2026-10-11' },
    '/en/journal/': { hash: HASH_A },
  };
  const current = {
    '/': { hash: HASH_A, date: '2026-10-12' },
    '/ja/': { hash: HASH_B, date: '2026-10-12' },
    '/en/about/': { hash: HASH_A, date: '2026-10-12' },
    '/ko/': { hash: HASH_B, date: '2026-10-12' },
    '/en/journal/': { hash: HASH_B },
    '/en/privacy/': { hash: HASH_B },
    '/off-site/': { hash: HASH_B },
  };
  assert.deepEqual(changedPublicPaths(previous, current), ['/ja/', '/ko/']);
});

test('removed, noindex, and non-site routes do not become IndexNow submissions', () => {
  assert.deepEqual(
    changedPublicPaths({ '/en/': { hash: HASH_A } }, { '/en/journal/': { hash: HASH_B } }),
    [],
  );
  assert.equal(SEARCH_ROUTES.length, 157);
  assert.ok(!SEARCH_ROUTES.some((route) => /\/(?:journal|privacy)\/$/.test(route)));
});

test('invalid, missing, or malformed source fingerprints fail closed', () => {
  assert.throws(() => changedPublicPaths(null, {}), /complete content-fingerprint maps/);
  assert.throws(() => changedPublicPaths({}, { '/en/': { hash: 'invalid' } }), /Invalid content fingerprint/);
});

test('IndexNow ownership proof is a single hosted UTF-8 file with matching path', async () => {
  const { key, file, url } = await publicIndexNowKey();
  assert.match(key, /^[a-f0-9]{32}$/);
  assert.equal(file, `${key}.txt`);
  assert.equal(url, `https://sense6.net/${file}`);
  assert.equal((await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8')).trim(), key);
});

test('payload is limited to the actual site and its canonical published URLs', async () => {
  const { key, url } = await publicIndexNowKey();
  const payload = indexNowPayload(['/ja/', '/ko/', '/zh-hans/'], key, url);
  assert.deepEqual(payload.urlList, [
    'https://sense6.net/ja/',
    'https://sense6.net/ko/',
    'https://sense6.net/zh-hans/',
  ]);
  assert.equal(payload.host, 'sense6.net');
  assert.throws(() => indexNowPayload(['/en/journal/'], key, url), /nonindexable URL/);
  assert.throws(() => indexNowPayload(['https://external.example/'], key, url), /nonindexable URL/);
  assert.throws(() => indexNowPayload(['/ja/', '/ja/'], key, url), /duplicate/);
  assert.throws(
    () => indexNowPayload(['/ja/'], key, 'https://external.example/key.txt'),
    /exact Sense6 root/,
  );
  assert.throws(() => indexNowPayload([], key, url), /nonempty/);
});

test('CLI is dry-run first and requires two concrete release commit IDs', () => {
  const help = spawnSync(process.execPath, ['scripts/submit-indexnow.mjs', '--help'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Default: offline dry-run/);
  for (const args of [[], ['--submit'], ['--before', 'HEAD', '--after', 'HEAD']]) {
    const invalid = spawnSync(process.execPath, ['scripts/submit-indexnow.mjs', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /40-character commit SHAs/);
  }
});
