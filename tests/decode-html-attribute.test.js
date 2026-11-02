import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeAttribute } from '../scripts/decode-html-attribute.mjs';

test('HTML URL attributes decode once without interpreting double-escaped markup', () => {
  assert.equal(decodeAttribute('/a?x=1&amp;y=2'), '/a?x=1&y=2');
  assert.equal(decodeAttribute('&quot;hello&#39;&lt;&gt;'), '"hello\'<>');
  assert.equal(decodeAttribute('foo&amp;lt;bar'), 'foo&lt;bar');
  assert.equal(decodeAttribute('foo&amp;amp;bar'), 'foo&amp;bar');
  assert.equal(decodeAttribute('ok &unknown;'), 'ok &unknown;');
});
