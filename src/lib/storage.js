const FORMAT = 'sense6-result';

/** @typedef {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void }} StorageLike */

/**
 * @template T
 * @param {{
 *   key: string,
 *   legacyKeys?: string[],
 *   version?: number,
 *   validate?: (value: unknown) => boolean,
 *   migrations?: Record<number, (value: unknown) => unknown>
 * }} options
 * @returns {{ key: string, version: number, load: (storage?: StorageLike) => T | null, save: (value: T, storage?: StorageLike) => boolean }}
 */
export function createResultStore({
  key,
  legacyKeys = [],
  version = 1,
  validate = isRecord,
  migrations = {},
}) {
  if (!key || !Number.isInteger(version) || version < 1)
    throw new TypeError('A key and positive version are required.');

  return Object.freeze({
    key,
    version,
    load(storage = globalThis.localStorage) {
      if (!storage) return null;
      try {
        for (const candidate of [key, ...legacyKeys]) {
          const parsed = parse(storage.getItem(candidate));
          if (!parsed) continue;
          if (
            candidate === key &&
            parsed.format === FORMAT &&
            Number.isInteger(parsed.schemaVersion) &&
            parsed.schemaVersion > version
          ) {
            return null;
          }
          const value = readPayload(parsed, version, migrations);
          if (!validate(value)) continue;
          if (candidate !== key || parsed.format !== FORMAT || parsed.schemaVersion !== version) {
            write(storage, key, version, value);
          }
          return value;
        }
      } catch {
        return null;
      }
      return null;
    },
    save(value, storage = globalThis.localStorage) {
      if (!storage || !validate(value)) return false;
      return write(storage, key, version, value);
    },
  });
}

/** @param {unknown} value */
export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {any} parsed
 * @param {number} targetVersion
 * @param {Record<number, (value: unknown) => unknown>} migrations
 */
function readPayload(parsed, targetVersion, migrations) {
  if (parsed.format !== FORMAT) return parsed;
  if (!Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion < 1) return null;
  if (parsed.schemaVersion > targetVersion) return null;
  let value = parsed.payload;
  for (let version = parsed.schemaVersion + 1; version <= targetVersion; version += 1) {
    const migrate = migrations[version];
    if (typeof migrate !== 'function') return null;
    value = migrate(value);
  }
  return value;
}

/** @param {StorageLike} storage @param {string} key @param {number} version @param {unknown} payload */
function write(storage, key, version, payload) {
  try {
    storage.setItem(
      key,
      JSON.stringify({
        format: FORMAT,
        schemaVersion: version,
        savedAt: new Date().toISOString(),
        payload,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

/** @param {string | null} raw @returns {any} */
function parse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
