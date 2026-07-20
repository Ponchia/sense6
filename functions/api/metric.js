import { isAllowedMetric, PRODUCTION_METRIC_ORIGIN } from '../../src/metrics.js';

const MAX_BODY_BYTES = 128;
const RESPONSE_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'text/plain; charset=utf-8',
};

function response(status, message = '', extraHeaders = {}) {
  const headers = {
    ...(status === 204 ? { 'cache-control': 'no-store' } : RESPONSE_HEADERS),
    ...extraHeaders,
  };
  return new Response(message || null, { status, headers });
}

function isProductionOrigin(request) {
  if (new URL(request.url).origin !== PRODUCTION_METRIC_ORIGIN) return false;
  const origin = request.headers.get('origin');
  if (origin !== PRODUCTION_METRIC_ORIGIN) return false;

  const fetchSite = request.headers.get('sec-fetch-site');
  return !fetchSite || fetchSite === 'same-origin';
}

async function readSmallBody(request) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return { tooLarge: true };
  if (!request.body) return { text: '' };

  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder('utf-8', { fatal: true }).decode(body) };
}

function validPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const keys = Object.keys(payload).sort();
  return (
    keys.length === 2 &&
    keys[0] === 'event' &&
    keys[1] === 'test' &&
    typeof payload.event === 'string' &&
    typeof payload.test === 'string' &&
    isAllowedMetric(payload.event, payload.test)
  );
}

async function handleMetricPost({ request, env }) {
  if (!isProductionOrigin(request)) return response(403, 'Forbidden');
  if (request.headers.get('content-type')?.split(';', 1)[0].trim() !== 'application/json') {
    return response(415, 'Unsupported media type');
  }

  let payload;
  try {
    const body = await readSmallBody(request);
    if (body.tooLarge) return response(413, 'Payload too large');
    payload = JSON.parse(body.text);
  } catch {
    return response(400, 'Invalid request');
  }
  if (!validPayload(payload)) return response(400, 'Invalid request');
  if (!env.ANALYTICS_DB) return response(503, 'Metrics unavailable');

  const day = new Date().toISOString().slice(0, 10);
  try {
    await env.ANALYTICS_DB.prepare(
      `INSERT INTO daily_metrics (day, test, metric, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (day, test, metric)
       DO UPDATE SET count = count + 1`,
    )
      .bind(day, payload.test, payload.event)
      .run();
  } catch {
    return response(503, 'Metrics unavailable');
  }

  return response(204);
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return response(405, 'Method not allowed', { allow: 'POST' });
  }
  return handleMetricPost(context);
}
