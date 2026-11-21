const MAX_STATIC_REDIRECTS = 2_000;

/**
 * Consolidate common doubled-slash variants of published directory routes.
 * Exact aliases leave unknown paths and nonindexable utilities alone. Cloudflare
 * Pages preserves the request query when the destination has no query of its own.
 * Keep these static rules before the existing dynamic locale-alias rules.
 *
 * @param {Array<{ path: string }>} canonicalPaths The same indexable paths as the sitemap.
 * @param {string} existingRedirects Hand-maintained public/_redirects contents.
 */
export function renderCanonicalRedirects(canonicalPaths, existingRedirects = '') {
  const rules = [];
  for (const path of new Set(canonicalPaths.map((entry) => entry.path))) {
    if (path === '/') continue;
    if (typeof path !== 'string' || !/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/.test(path)) {
      throw new Error(`Invalid canonical directory path: ${path}`);
    }
    for (const alias of doubledSlashAliases(path)) rules.push(`${alias} ${path} 301`);
  }
  const existingStaticCount = existingRedirects
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .filter((line) => !/\*|:[A-Za-z]/.test(line.split(/\s+/)[0] ?? '')).length;
  if (rules.length + existingStaticCount > MAX_STATIC_REDIRECTS) {
    throw new Error('Canonical aliases exceed the Cloudflare Pages static redirect limit');
  }
  return [
    '# Generated exact aliases for published canonical routes; do not edit dist/_redirects.',
    ...rules,
    '',
    existingRedirects.trimEnd(),
    '',
  ].join('\n');
}

/** @param {string} path */
function doubledSlashAliases(path) {
  const variants = new Set([path]);
  // Work from right to left so earlier separator positions remain unchanged.
  // Never double the leading slash: // can be interpreted as a host reference.
  for (let index = path.length - 1; index > 0; index -= 1) {
    if (path[index] !== '/') continue;
    for (const variant of [...variants]) {
      variants.add(`${variant.slice(0, index)}/${variant.slice(index)}`);
    }
    if (variants.size > MAX_STATIC_REDIRECTS) {
      throw new Error('Canonical aliases exceed the Cloudflare Pages static redirect limit');
    }
  }
  variants.delete(path);
  return variants;
}
