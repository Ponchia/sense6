/**
 * Cloudflare performs baseline URL normalization, including collapsing repeated
 * slashes, before its Pages static redirect rules are matched. An alias like
 * "/en// /en/ 301" therefore matches the canonical "/en/" and loops.
 *
 * Validate normalized request paths before uploading a Pages deployment.
 * @param {string} redirects
 */
export function assertSafeCloudflareRedirects(redirects) {
  for (const [index, raw] of redirects.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [source, destination, status, ...extra] = line.split(/\s+/);
    if (
      !source?.startsWith('/') ||
      !destination?.startsWith('/') ||
      !/^(301|302|303|307|308)$/.test(status ?? '') ||
      extra.length
    ) {
      throw new Error(`Invalid Pages redirect rule at line ${index + 1}`);
    }
    // Wildcard/capture rules have a separate routing contract. They must still
    // be verified on the live edge; do not compare them as exact paths.
    if (/[^\w/%.-]/.test(source) || /[^\w/%.-]/.test(destination)) continue;
    const normalize = (path) => path.replace(/\/{2,}/g, '/');
    if (normalize(source) === normalize(destination)) {
      throw new Error(
        `Cloudflare-normalized self-redirect at line ${index + 1}: ${source} -> ${destination}`,
      );
    }
  }
}
