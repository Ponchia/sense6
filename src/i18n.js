import { messageSource } from './i18n/message-ids.js';
import { DEFAULT_LOCALE, LOCALES, loadMessages, localeMetadata, resolveLocale } from './locales.js';

/** @typedef {import('./locale-metadata.js').LocaleCode} LocaleCode */

const STORAGE_KEY = 'sense6:locale';
/** @type {WeakMap<Text, string>} */
const textSources = new WeakMap();
/** @type {WeakMap<Element, Map<string, string>>} */
const attributeSources = new WeakMap();
/** @type {LocaleCode} */
let locale = DEFAULT_LOCALE;
/** @type {Map<string, string>} */
let messages = new Map();
/** @type {Map<string, Array<{ key: string, value: string, order: number }>>} */
let dynamicMessageBuckets = new Map();
/** @type {((locale: LocaleCode) => void | Promise<void>) | null} */
let localeChangeHandler = null;
let localeRequestGeneration = 0;
/** @type {{ href: string, locale: LocaleCode } | null} */
let initialCatalogFailure = null;

/** @param {{ initialLocale?: unknown, onLocaleChange?: (locale: LocaleCode) => void | Promise<void> }} options */
export async function initializeI18n({ initialLocale, onLocaleChange } = {}) {
  localeChangeHandler = onLocaleChange ?? null;
  const requestedLocale =
    normalizeLocale(initialLocale) ?? storedLocale() ?? browserLocale() ?? DEFAULT_LOCALE;
  const requestGeneration = ++localeRequestGeneration;
  try {
    const initialMessages = await loadMessages(requestedLocale);
    if (requestGeneration === localeRequestGeneration) {
      initialCatalogFailure = null;
      locale = requestedLocale;
      messages = initialMessages;
      dynamicMessageBuckets = indexDynamicMessages(messages);
    }
  } catch {
    if (requestGeneration === localeRequestGeneration) {
      initialCatalogFailure = {
        href: initialLocaleHref(requestedLocale),
        locale: requestedLocale,
      };
      locale = DEFAULT_LOCALE;
      messages = new Map();
      dynamicMessageBuckets = new Map();
    }
  }
  applyDocumentLocale();
  renderLocaleSelector();
  renderInitialLocaleRetry();
  translatePersistentShell();
  localizeInternalLinks(document);
  return locale;
}

export function getLocale() {
  return locale;
}

/** @param {unknown} nextLocale @param {{ notify?: boolean }} options */
export async function setLocale(nextLocale, { notify = true } = {}) {
  const normalized = normalizeLocale(nextLocale);
  if (!normalized) return false;
  const requestGeneration = ++localeRequestGeneration;
  if (normalized === locale) return false;
  let nextMessages;
  let nextDynamicMessageBuckets;
  try {
    nextMessages = await loadMessages(normalized);
    nextDynamicMessageBuckets = indexDynamicMessages(nextMessages);
  } catch {
    if (requestGeneration !== localeRequestGeneration) return false;
    restoreLocaleSelector();
    if (initialCatalogFailure?.locale === normalized) {
      window.location.assign(initialCatalogFailure.href);
    }
    return false;
  }
  if (requestGeneration !== localeRequestGeneration) return false;
  initialCatalogFailure = null;
  locale = normalized;
  messages = nextMessages;
  dynamicMessageBuckets = nextDynamicMessageBuckets;
  applyDocumentLocale();
  renderInitialLocaleRetry();
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Language still applies for this page when storage is unavailable.
  }
  const selector = document.querySelector('[data-locale-select]');
  if (selector instanceof HTMLSelectElement) selector.value = locale;
  translatePersistentShell();
  localizeInternalLinks(document);
  if (notify) await localeChangeHandler?.(locale);
  return true;
}

/** @param {string} source @param {Record<string, string | number>} values */
export function t(source, values = {}) {
  const translated = messages.get(source) ?? (Object.keys(values).length ? source : translateExact(source));
  return interpolateMessage(translated, values, locale);
}

/**
 * Translate shared interface copy through a stable message ID.
 * @param {import('./i18n/message-ids.js').MessageId} id
 * @param {Record<string, string | number>} [values]
 */
export function m(id, values = {}) {
  return t(messageSource(id), values);
}

/**
 * @param {string} template
 * @param {Record<string, string | number>} values
 * @param {LocaleCode} localeCode
 */
export function interpolateMessage(template, values, localeCode) {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{${key}}`, interpolationValue(value, localeCode)),
    template,
  );
}

/** @param {string | number} value @param {LocaleCode} [localeCode] */
function interpolationValue(value, localeCode = locale) {
  const rendered = String(value);
  return localeMetadata(localeCode).direction === 'rtl' ? `\u2068${rendered}\u2069` : rendered;
}

/** @param {number} value @param {Intl.NumberFormatOptions} [options] */
export function formatNumber(value, options) {
  return new Intl.NumberFormat(localeMetadata(locale).languageTag, options).format(value);
}

/** @param {string} route @param {string} targetLocale */
export function localeHref(route = '', targetLocale = locale) {
  const normalizedRoute = String(route).replace(/^\/+|\/+$/g, '');
  return `/${targetLocale}/${normalizedRoute ? `${normalizedRoute}/` : ''}`;
}

/**
 * Return a mount root that localizes every explicit HTML render. This keeps
 * translation at the view boundary and avoids observing arbitrary DOM changes.
 */
/** @param {HTMLElement} root */
export function localizedRoot(root) {
  return new Proxy(root, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, property, value) {
      const applied = Reflect.set(target, property, value, target);
      if (property === 'innerHTML') translateTree(target);
      return applied;
    },
  });
}

/** @param {Node | null} root */
export function translateTree(root) {
  if (!root) return;
  if (root instanceof Text) {
    translateTextNode(root);
    return;
  }
  if (!(root instanceof Element || root instanceof Document)) return;
  if (root instanceof Element) translateAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node instanceof Text) translateTextNode(node);
    node = walker.nextNode();
  }
  for (const element of root.querySelectorAll?.('[aria-label], [placeholder], [title]') ?? []) {
    translateAttributes(element);
  }
}

/** @param {Text} node */
function translateTextNode(node) {
  if (node.parentElement?.matches('script, style')) return;
  const current = node.data;
  const trimmed = current.trim();
  if (!trimmed) return;
  const declaredSource = node.parentElement?.getAttribute('data-i18n-source');
  const source = declaredSource ?? textSources.get(node) ?? trimmed;
  textSources.set(node, source);
  const translated = translateExact(source);
  if (translated === trimmed) return;
  const leading = current.match(/^\s*/)?.[0] ?? '';
  const trailing = current.match(/\s*$/)?.[0] ?? '';
  node.data = `${leading}${translated}${trailing}`;
}

/** @param {Element} element */
function translateAttributes(element) {
  const translatable = ['aria-label', 'placeholder', 'title'];
  let sources = attributeSources.get(element);
  if (!sources) {
    sources = new Map();
    attributeSources.set(element, sources);
  }
  for (const attribute of translatable) {
    if (!element.hasAttribute(attribute)) continue;
    const declaredSource = element.getAttribute(`data-i18n-${attribute}`);
    const source = declaredSource ?? sources.get(attribute) ?? element.getAttribute(attribute) ?? '';
    sources.set(attribute, source);
    const translated = translateExact(source);
    if (element.getAttribute(attribute) !== translated) element.setAttribute(attribute, translated);
  }
}

/** @param {string} source */
function translateExact(source) {
  if (locale === DEFAULT_LOCALE) return source;
  const normalized = source.replace(/\s+/g, ' ').trim();
  const direct = messages.get(normalized);
  if (direct) return direct;
  const countMatch = normalized.match(/^(\d+) (tests|trials|runs)$/);
  if (countMatch) {
    const count = countMatch[1];
    const noun = countMatch[2];
    if (count && noun) return `${interpolationValue(count)} ${messages.get(noun) ?? noun}`;
  }
  return translateDynamicText(normalized) ?? source;
}

/**
 * Translate live text whose variable values were already interpolated into the
 * DOM. Catalog extraction intentionally records its stable phrases separately;
 * selecting non-overlapping longest matches keeps those phrases localizable.
 */
/** @param {string} source */
function translateDynamicText(source) {
  const possibleMatches = [];
  for (let offset = 0; offset < source.length - 1; offset += 1) {
    const candidates = dynamicMessageBuckets.get(source.slice(offset, offset + 2));
    if (!candidates) continue;
    for (const candidate of candidates) {
      if (!source.startsWith(candidate.key, offset)) continue;
      const end = offset + candidate.key.length;
      const beginsInsideWord = isWord(source[offset - 1]) && isWord(candidate.key[0]);
      const endsInsideWord = isWord(candidate.key.at(-1)) && isWord(source[end]);
      if (!beginsInsideWord && !endsInsideWord) {
        possibleMatches.push({ ...candidate, offset, end });
      }
    }
  }
  if (!possibleMatches.length) return null;
  possibleMatches.sort(
    (left, right) =>
      right.key.length - left.key.length || left.order - right.order || left.offset - right.offset,
  );
  const occupied = new Uint8Array(source.length);
  const matches = [];
  for (const match of possibleMatches) {
    if (occupied.subarray(match.offset, match.end).some(Boolean)) continue;
    occupied.fill(1, match.offset, match.end);
    matches.push(match);
  }
  if (!matches.length) return null;

  matches.sort((left, right) => left.offset - right.offset);
  let cursor = 0;
  let output = '';
  for (const match of matches) {
    output += dynamicFragment(source.slice(cursor, match.offset));
    output += match.value;
    cursor = match.end;
  }
  return output + dynamicFragment(source.slice(cursor));
}

/** @param {Map<string, string>} catalog */
function indexDynamicMessages(catalog) {
  /** @type {Map<string, Array<{ key: string, value: string, order: number }>>} */
  const buckets = new Map();
  let order = 0;
  for (const [key, value] of catalog) {
    if (key === value || key.includes('{') || key.length <= 1) continue;
    const prefix = key.slice(0, 2);
    const bucket = buckets.get(prefix) ?? [];
    bucket.push({ key, value, order });
    buckets.set(prefix, bucket);
    order += 1;
  }
  return buckets;
}

/** @param {string} fragment */
function dynamicFragment(fragment) {
  if (localeMetadata(locale).direction !== 'rtl' || !/[\p{L}\p{N}]/u.test(fragment)) return fragment;
  return interpolationValue(fragment);
}

/** @param {string | undefined} value */
function isWord(value) {
  return Boolean(value && /[\p{L}\p{N}]/u.test(value));
}

function renderLocaleSelector() {
  const selector = document.querySelector('[data-locale-select]');
  if (!(selector instanceof HTMLSelectElement)) return;
  selector.innerHTML = LOCALES.map(
    (entry) =>
      `<option value="${entry.code}" lang="${entry.languageTag}" dir="${entry.direction}">${entry.label}</option>`,
  ).join('');
  selector.value = locale;
  selector.addEventListener('change', () => void setLocale(selector.value));
}

function restoreLocaleSelector() {
  const selector = document.querySelector('[data-locale-select]');
  if (selector instanceof HTMLSelectElement) selector.value = locale;
}

function renderInitialLocaleRetry() {
  document.querySelector('[data-locale-retry]')?.remove();
  if (!initialCatalogFailure) return;
  const selector = document.querySelector('[data-locale-select]');
  const picker = selector?.closest('.locale-picker');
  if (!picker) return;
  const retry = document.createElement('a');
  retry.className = 'ui-link locale-retry';
  retry.dataset.localeRetry = '';
  retry.href = initialCatalogFailure.href;
  retry.textContent = 'Retry language';
  picker.insertAdjacentElement('afterend', retry);
}

function translatePersistentShell() {
  for (const element of document.querySelectorAll(
    '[data-i18n-source], [data-i18n-aria-label], [data-i18n-placeholder], [data-i18n-title]',
  )) {
    translateTree(element);
  }
}

/** @param {ParentNode} root */
function localizeInternalLinks(root) {
  for (const link of root.querySelectorAll?.('a[data-sense6-route]') ?? []) {
    if (link instanceof HTMLAnchorElement) link.setAttribute('href', localeHref(link.dataset.sense6Route));
  }
}

/** @param {unknown} value */
export function normalizeLocale(value) {
  return resolveLocale(value);
}

function applyDocumentLocale() {
  const metadata = localeMetadata(locale);
  document.documentElement.lang = metadata.languageTag;
  document.documentElement.dir = metadata.direction;
}

function storedLocale() {
  try {
    return normalizeLocale(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function browserLocale() {
  for (const candidate of navigator.languages ?? [navigator.language]) {
    const normalized = normalizeLocale(candidate);
    if (normalized) return normalized;
  }
  return null;
}

/** @param {LocaleCode} requestedLocale */
function initialLocaleHref(requestedLocale) {
  const rawRoute = window.location.hash.startsWith('#/')
    ? window.location.hash.replace(/^#\/?/, '')
    : window.location.pathname.replace(/^\/+|\/+$/g, '');
  const parts = rawRoute.split('/').filter(Boolean);
  if (normalizeLocale(parts[0])) parts.shift();
  return `${localeHref(parts[0] ?? '', requestedLocale)}${window.location.search}`;
}
