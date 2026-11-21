/**
 * An arithmetic teaching model. These inputs are assumptions, never measurements
 * of a person, display or input device. Refresh intervals are reported separately
 * and must not be added to the assumed display contribution.
 */
export const TIMING_EXPLORER_ROUTE = 'browser-timing-explorer';
export const TIMING_EXPLORER_URL = `https://sense6.net/en/${TIMING_EXPLORER_ROUTE}/`;
export const REFRESH_RATES = Object.freeze([30, 60, 75, 90, 120, 144, 165, 240]);
export const TIMING_DEFAULTS = Object.freeze({
  response: 220,
  a: Object.freeze({ display: 16, input: 12, hz: 60 }),
  b: Object.freeze({ display: 8, input: 4, hz: 120 }),
});

/** @typedef {{display: number, input: number, hz: number}} TimingScenario */
/** @typedef {{response: number, a: TimingScenario, b: TimingScenario}} TimingConfiguration */

const QUERY_KEYS = Object.freeze(['response', 'ad', 'ai', 'ahz', 'bd', 'bi', 'bhz']);

/** @param {unknown} value @param {number} min @param {number} max */
function integerBetween(value, min, max) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** @param {unknown} value @returns {value is TimingScenario} */
function validScenario(value) {
  if (!value || typeof value !== 'object') return false;
  const scenario = /** @type {Record<string, unknown>} */ (value);
  return (
    integerBetween(scenario.display, 0, 100) &&
    integerBetween(scenario.input, 0, 100) &&
    typeof scenario.hz === 'number' &&
    REFRESH_RATES.includes(scenario.hz)
  );
}

/** @param {unknown} value @returns {value is TimingConfiguration} */
export function isTimingConfiguration(value) {
  if (!value || typeof value !== 'object') return false;
  const configuration = /** @type {Record<string, unknown>} */ (value);
  return (
    integerBetween(configuration.response, 100, 500) &&
    validScenario(configuration.a) &&
    validScenario(configuration.b)
  );
}

/** @returns {TimingConfiguration} */
export function defaultTimingConfiguration() {
  return { response: TIMING_DEFAULTS.response, a: { ...TIMING_DEFAULTS.a }, b: { ...TIMING_DEFAULTS.b } };
}

/** @param {number} hz */
export function refreshInterval(hz) {
  if (!REFRESH_RATES.includes(hz)) throw new RangeError('Choose a supported illustrative refresh rate');
  return 1000 / hz;
}

/** @param {TimingConfiguration} configuration */
export function compareTimingScenarios(configuration) {
  if (!isTimingConfiguration(configuration)) throw new RangeError('Invalid hypothetical timing values');
  const intervalA = configuration.response + configuration.a.display + configuration.a.input;
  const intervalB = configuration.response + configuration.b.display + configuration.b.input;
  return {
    intervalA,
    intervalB,
    difference: intervalB - intervalA,
    refreshA: refreshInterval(configuration.a.hz),
    refreshB: refreshInterval(configuration.b.hz),
  };
}

/**
 * Shared examples must be complete and unambiguous. Unknown parameters such as
 * inspection flags do not become part of a shared link. A malformed known value
 * restores the complete default rather than quietly mixing examples.
 * @param {string} search
 * @returns {{configuration: TimingConfiguration, state: 'default' | 'shared' | 'invalid'}}
 */
export function timingConfigurationFromSearch(search) {
  /** @param {'default' | 'shared' | 'invalid'} state */
  const fallback = (state) => ({ configuration: defaultTimingConfiguration(), state });
  if (search.length > 2048) return fallback('invalid');
  const params = new URLSearchParams(search);
  if (!QUERY_KEYS.some((key) => params.has(key))) return fallback('default');
  const values = QUERY_KEYS.map((key) => {
    const entries = params.getAll(key);
    return entries.length === 1 && /^(0|[1-9]\d{0,2})$/.test(entries[0] ?? '')
      ? Number(entries[0])
      : Number.NaN;
  });
  const [response, ad, ai, ahz, bd, bi, bhz] = values;
  const configuration = {
    response,
    a: { display: ad, input: ai, hz: ahz },
    b: { display: bd, input: bi, hz: bhz },
  };
  return isTimingConfiguration(configuration) ? { configuration, state: 'shared' } : fallback('invalid');
}

/** @param {TimingConfiguration} configuration */
export function timingConfigurationLink(configuration) {
  if (!isTimingConfiguration(configuration)) throw new RangeError('Invalid hypothetical timing values');
  const params = new URLSearchParams({
    response: String(configuration.response),
    ad: String(configuration.a.display),
    ai: String(configuration.a.input),
    ahz: String(configuration.a.hz),
    bd: String(configuration.b.display),
    bi: String(configuration.b.input),
    bhz: String(configuration.b.hz),
  });
  return `${TIMING_EXPLORER_URL}?${params}`;
}
