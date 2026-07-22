import { resolveOptionalStorage } from './storage-access.js';

const FORMAT = 'sense6-result';

/** @typedef {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void }} StorageLike */
/** @typedef {{ format: string, schemaVersion: number, payload: unknown }} ResultEnvelope */

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
    load(storage) {
      const resolvedStorage = resolveOptionalStorage(storage);
      if (!resolvedStorage) return null;
      try {
        for (const candidate of [key, ...legacyKeys]) {
          const parsed = parse(resolvedStorage.getItem(candidate));
          if (!parsed) continue;
          if (candidate === key && isResultEnvelope(parsed) && parsed.schemaVersion > version) {
            return null;
          }
          const value = readPayload(parsed, version, migrations);
          if (!validate(value)) continue;
          const validated = /** @type {T} */ (value);
          if (candidate !== key || !isResultEnvelope(parsed) || parsed.schemaVersion !== version) {
            write(resolvedStorage, key, version, validated);
          }
          return validated;
        }
      } catch {
        return null;
      }
      return null;
    },
    save(value, storage) {
      const resolvedStorage = resolveOptionalStorage(storage);
      if (!resolvedStorage || !validate(value)) return false;
      return write(resolvedStorage, key, version, value);
    },
  });
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} parsed
 * @param {number} targetVersion
 * @param {Record<number, (value: unknown) => unknown>} migrations
 */
function readPayload(parsed, targetVersion, migrations) {
  if (hasResultFormat(parsed) && !isResultEnvelope(parsed)) return null;
  if (!isResultEnvelope(parsed)) return parsed;
  if (parsed.schemaVersion < 1) return null;
  if (parsed.schemaVersion > targetVersion) return null;
  let value = parsed.payload;
  for (let version = parsed.schemaVersion + 1; version <= targetVersion; version += 1) {
    const migrate = migrations[version];
    if (typeof migrate !== 'function') return null;
    value = migrate(value);
  }
  return value;
}

/** @param {unknown} value @returns {value is Record<string, unknown> & { format: typeof FORMAT }} */
function hasResultFormat(value) {
  return isRecord(value) && value.format === FORMAT;
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

/** @param {string | null} raw @returns {unknown} */
function parse(raw) {
  if (!raw) return null;
  try {
    return /** @type {unknown} */ (JSON.parse(raw));
  } catch {
    return null;
  }
}

/** @param {unknown} value @returns {value is ResultEnvelope} */
function isResultEnvelope(value) {
  return (
    hasResultFormat(value) &&
    typeof value.schemaVersion === 'number' &&
    Number.isInteger(value.schemaVersion) &&
    Object.hasOwn(value, 'payload')
  );
}
