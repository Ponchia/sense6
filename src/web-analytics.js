/**
 * Cloudflare's cookie-free page and performance measurements complement our
 * independent aggregate D1 product counters. Never send answers or test events.
 *
 * Preview deployments, localhost and all alternate hostnames must not be
 * instrumented. No analytics library is bundled or loaded outside production.
 */
export const WEB_ANALYTICS_ORIGIN = 'https://static.cloudflareinsights.com/beacon.min.js';
export const WEB_ANALYTICS_SITE = 'sense6.net';
const SITE_TOKEN = 'f57709663e3a4d92ba4a492c242cf90b';

/** @param {{ hostname?: string, document?: Document }} context */
export function startWebAnalytics({ hostname, document: doc } = {}) {
  const resolvedHostname = hostname ?? (typeof window === 'undefined' ? '' : window.location.hostname);
  const resolvedDocument = doc ?? (typeof document === 'undefined' ? undefined : document);
  if (resolvedHostname !== WEB_ANALYTICS_SITE || !resolvedDocument) return false;
  if (resolvedDocument.querySelector('script[data-cf-beacon]')) return false;

  const beacon = resolvedDocument.createElement('script');
  beacon.type = 'module';
  beacon.src = WEB_ANALYTICS_ORIGIN;
  beacon.dataset.cfBeacon = JSON.stringify({ token: SITE_TOKEN, spa: true });
  resolvedDocument.head.append(beacon);
  return true;
}
