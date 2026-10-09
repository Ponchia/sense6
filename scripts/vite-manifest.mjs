import { readFile, stat } from 'node:fs/promises';

const SUPPLEMENTAL_LOCALES = new Set(['ar', 'hi', 'ja', 'ko', 'pt-br', 'zh-hans']);

/**
 * Measure the raw JS fetched for the Vite entry and one dynamically selected
 * locale. Static imports are traversed transitively and output files are
 * deduplicated before their sizes are summed.
 * @param {string} locale
 * @param {URL} [dist]
 */
export async function measureInitialLocaleGraph(locale, dist = new URL('../dist/', import.meta.url)) {
  const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', dist), 'utf8'));
  const entry = Object.entries(manifest).find(([, value]) => value.isEntry)?.[0];
  const localeEntry = `src/locales/${locale}.js`;
  if (!entry) throw new Error('Vite manifest has no entry chunk');
  if (!manifest[localeEntry]) throw new Error(`Vite manifest has no ${localeEntry} chunk`);

  const visitedEntries = new Set();
  const outputFiles = new Set();
  const visit = (key) => {
    if (visitedEntries.has(key)) return;
    const record = manifest[key];
    if (!record) throw new Error(`Vite manifest import ${key} is missing`);
    visitedEntries.add(key);
    if (record.file.endsWith('.js')) outputFiles.add(record.file);
    for (const imported of record.imports ?? []) visit(imported);
  };
  visit(entry);
  visit(localeEntry);

  const files = await Promise.all(
    [...outputFiles].sort().map(async (file) => ({
      file,
      bytes: (await stat(new URL(file, dist))).size,
    })),
  );
  return {
    bytes: files.reduce((total, file) => total + file.bytes, 0),
    files,
  };
}

/**
 * Return the active route's transitive JavaScript output, excluding the main
 * entry that Vite already includes in every HTML document.
 * @param {string} locale
 * @param {string} route
 * @param {URL} [dist]
 */
export async function activeRouteModuleFiles(locale, route, dist = new URL('../dist/', import.meta.url)) {
  const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', dist), 'utf8'));
  const entry = Object.entries(manifest).find(([, value]) => value.isEntry)?.[0];
  if (!entry) throw new Error('Vite manifest has no entry chunk');
  if (!route) return [];
  const routeEntry = routeModuleEntry(route);
  if (!manifest[routeEntry]) throw new Error(`Vite manifest has no ${routeEntry} chunk`);

  const roots = [routeEntry];
  if (SUPPLEMENTAL_LOCALES.has(locale) && ['journal', 'privacy'].includes(route)) {
    roots.push(`src/locales/supplemental/${locale}.js`);
  }

  const visited = new Set([entry]);
  const outputFiles = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    const record = manifest[key];
    if (!record) throw new Error(`Vite manifest import ${key} is missing`);
    visited.add(key);
    if (record.file.endsWith('.js')) outputFiles.add(record.file);
    for (const imported of record.imports ?? []) visit(imported);
  };
  for (const root of roots) visit(root);
  return [...outputFiles].sort();
}

/** @param {string} locale @param {string} route @param {URL} [dist] */
export async function measureActiveRouteGraph(locale, route, dist = new URL('../dist/', import.meta.url)) {
  const outputFiles = await activeRouteModuleFiles(locale, route, dist);
  const files = await Promise.all(
    outputFiles.map(async (file) => ({ file, bytes: (await stat(new URL(file, dist))).size })),
  );
  return { bytes: files.reduce((total, file) => total + file.bytes, 0), files };
}

/** @param {string} route */
function routeModuleEntry(route) {
  if (route === 'about') return 'src/about.js';
  if (route === 'journal') return 'src/journal.js';
  if (route === 'privacy') return 'src/privacy.js';
  if (['learn', 'tetrachromacy-guide', 'reaction-time-guide'].includes(route)) return 'src/learn.js';
  return `src/exams/${route}.js`;
}
