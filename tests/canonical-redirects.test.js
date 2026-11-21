import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertSafeCloudflareRedirects } from '../scripts/redirect-safety.mjs';

test('Cloudflare-normalized source paths may not redirect to themselves', () => {
  for (const line of [
    '/en// /en/ 301',
    '/en/ /en/ 301',
    '/en//reaction-time-guide/ /en/reaction-time-guide/ 301',
    '/en/browser-timing-explorer// /en/browser-timing-explorer/ 301',
  ]) {
    assert.throws(
      () => assertSafeCloudflareRedirects(`${line}\n`),
      /Cloudflare-normalized self-redirect/,
      line,
    );
  }
});

test('the authored Pages redirects preserve distinct locale aliases', async () => {
  const authored = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');
  assertSafeCloudflareRedirects(authored);
  assert.match(authored, /^\/pt-BR\/\* \/pt-br\/:splat 301$/m);
  assert.match(authored, /^\/zh-CN\/\* \/zh-hans\/:splat 301$/m);
  assert.doesNotMatch(authored, /\/en\/\/\s+\/en\//);
});

test('reject malformed redirect syntax before publishing', () => {
  for (const value of [
    '/en/ https://external.example/ 301',
    '/en/ /en/ 999',
    '/en/',
    '/en/ /en/ 301 extra',
  ]) {
    assert.throws(() => assertSafeCloudflareRedirects(value), /Invalid Pages redirect rule/);
  }
});
