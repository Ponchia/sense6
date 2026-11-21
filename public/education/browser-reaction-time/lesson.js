document.querySelector('.print-button')?.addEventListener('click', () => window.print());

// Match the app's existing Cloudflare Web Analytics policy: production host
// only, explicit ?metrics=off exclusion, no scores or custom test events.
// The public site token is the same as in src/web-analytics.js. Nothing is
// loaded on localhost, test previews or alternate hostnames.
if (
  window.location.hostname === 'sense6.net' &&
  !new URLSearchParams(window.location.search).getAll('metrics').includes('off') &&
  !document.querySelector('script[data-cf-beacon]')
) {
  const beacon = document.createElement('script');
  beacon.type = 'module';
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.dataset.cfBeacon = JSON.stringify({ token: 'f57709663e3a4d92ba4a492c242cf90b', spa: false });
  document.head.append(beacon);
}
