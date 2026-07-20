/** @param {string} value */
function placeholders(value) {
  return [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
}

/**
 * @typedef {object} CatalogAudit
 * @property {string} locale
 * @property {number} total
 * @property {number} translated
 * @property {number} progress
 * @property {string[]} untranslated
 * @property {string[]} missing
 * @property {string[]} extra
 * @property {string[]} empty
 * @property {string[]} placeholderDrift
 * @property {string[]} missingStableIds
 * @property {number} duplicateRows
 * @property {boolean} valid
 */

/**
 * @param {object} input
 * @param {string} input.locale
 * @param {ReadonlyMap<string, string>} input.catalog
 * @param {readonly string[]} input.englishKeys
 * @param {Readonly<Record<string, string>>} input.messageSources
 * @param {number} input.rowCount
 * @param {string} [input.defaultLocale]
 * @returns {CatalogAudit}
 */
export function auditCatalog({
  locale,
  catalog,
  englishKeys,
  messageSources,
  rowCount,
  defaultLocale = 'en',
}) {
  const englishKeySet = new Set(englishKeys);
  const missing = englishKeys.filter((source) => !catalog.has(source));
  const extra = [...catalog.keys()].filter((source) => !englishKeySet.has(source));
  const empty = englishKeys.filter((source) => catalog.has(source) && !catalog.get(source)?.trim());
  const placeholderDrift = englishKeys.filter((source) => {
    const value = catalog.get(source);
    if (typeof value !== 'string') return false;
    return JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(source));
  });
  const missingStableIds = Object.entries(messageSources)
    .filter(([, source]) => !catalog.has(source))
    .map(([id]) => id);
  const untranslated =
    locale === defaultLocale
      ? []
      : englishKeys.filter((source) => catalog.get(source)?.trim() === source.trim());
  const translated = englishKeys.length - missing.length - empty.length - untranslated.length;
  const duplicateRows = Math.max(0, rowCount - catalog.size);
  const valid =
    missing.length === 0 &&
    extra.length === 0 &&
    empty.length === 0 &&
    placeholderDrift.length === 0 &&
    missingStableIds.length === 0 &&
    duplicateRows === 0;

  return {
    locale,
    total: englishKeys.length,
    translated,
    progress: englishKeys.length ? (translated / englishKeys.length) * 100 : 100,
    untranslated,
    missing,
    extra,
    empty,
    placeholderDrift,
    missingStableIds,
    duplicateRows,
    valid,
  };
}
