import { readFile, stat } from 'node:fs/promises';

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
