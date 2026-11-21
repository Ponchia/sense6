/**
 * Reject redirects that become self redirects when the edge collapses slashes.
 * Cloudflare can normalize _redirects sources before matching them: /en// can
 * therefore match /en/. Keep slash aliases out of the Pages redirect artifact.
 * This guards the observed failure, rather than emulating every edge transform.
 * @param {string} redirects
 */
export function assertNoNormalizedSelfRedirects(redirects) {
  for (const line of redirects.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [source, destination, status] = trimmed.split(/\s+/);
    if (!source || !destination || (status && !/^3\d\d$/.test(status))) continue;
    if (normalizedTarget(source) === normalizedTarget(destination)) {
      throw new Error(`Pages redirect becomes a normalized self redirect: ${trimmed}`);
    }
  }
}

/** @param {string} value */
function normalizedTarget(value) {
  const url = new URL(value, 'https://sense6.net');
  return `${url.origin}${url.pathname.replace(/\/{2,}/g, '/').replaceAll(':splat', '*')}`;
}
