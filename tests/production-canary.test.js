import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { fetchCanonicalPage } from '../scripts/production-canary.mjs';

test('the canonical canary rejects real HTTP redirects immediately and requires exactly 200', async (t) => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(request.url);
    if (request.url === '/loop/') response.writeHead(301, { location: '/loop/' });
    else if (request.url === '/move/') response.writeHead(302, { location: '/ok/' });
    else response.writeHead(request.url === '/created/' ? 201 : 200);
    response.end('Sense6');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetchCanonicalPage(new URL('/ok/', base))).status, 200);
  await assert.rejects(fetchCanonicalPage(new URL('/loop/', base)), /without a redirect/);
  await assert.rejects(fetchCanonicalPage(new URL('/move/', base)), /without a redirect/);
  await assert.rejects(fetchCanonicalPage(new URL('/created/', base)), /expected HTTP 200/);
  assert.deepEqual(requests, ['/ok/', '/loop/', '/move/', '/created/']);
});
