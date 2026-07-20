import { messageSource } from './i18n/message-ids.js';
import { DEFAULT_LOCALE, LOCALES, loadMessages, localeMetadata, resolveLocale } from './locales.js';

const STORAGE_KEY = 'sense6:locale';
const textSources = new WeakMap();
const attributeSources = new WeakMap();
let locale = DEFAULT_LOCALE;
let messages = new Map();
let localeChangeHandler = null;

export async function initializeI18n({ initialLocale, onLocaleChange } = {}) {
  localeChangeHandler = onLocaleChange ?? null;
  locale = normalizeLocale(initialLocale) ?? storedLocale() ?? browserLocale() ?? DEFAULT_LOCALE;
  messages = await loadMessages(locale);
  applyDocumentLocale();
  renderLocaleSelector();
  translateTree(document.documentElement);
  localizeInternalLinks(document);
  return locale;
}

export function getLocale() {
  return locale;
}

export async function setLocale(nextLocale, { notify = true } = {}) {
  const normalized = normalizeLocale(nextLocale);
  if (!normalized || normalized === locale) return false;
  const nextMessages = await loadMessages(normalized);
  locale = normalized;
  messages = nextMessages;
  applyDocumentLocale();
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Language still applies for this page when storage is unavailable.
  }
  const selector = document.querySelector('[data-locale-select]');
  if (selector) selector.value = locale;
  translateTree(document.documentElement);
  localizeInternalLinks(document);
  if (notify) await localeChangeHandler?.(locale);
  return true;
}

export function t(source, values = {}) {
  const translated = messages.get(source) ?? (Object.keys(values).length ? source : translateExact(source));
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{${key}}`, interpolationValue(value)),
    translated,
  );
}

/**
 * Translate shared interface copy through a stable message ID.
 * @param {import('./i18n/message-ids.js').MessageId} id
 * @param {Record<string, string | number>} [values]
 */
export function m(id, values = {}) {
  return t(messageSource(id), values);
}

function interpolationValue(value) {
  const rendered = String(value);
  return localeMetadata(locale).direction === 'rtl' ? `\u2068${rendered}\u2069` : rendered;
}

export function formatNumber(value, options) {
  return new Intl.NumberFormat(localeMetadata(locale).languageTag, options).format(value);
}

export function localeHref(route = '', targetLocale = locale) {
  const normalizedRoute = String(route).replace(/^\/+|\/+$/g, '');
  return `/${targetLocale}/${normalizedRoute ? `${normalizedRoute}/` : ''}`;
}

/**
 * Return a mount root that localizes every explicit HTML render. This keeps
 * translation at the view boundary and avoids observing arbitrary DOM changes.
 */
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

export function translateTree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateTextNode(node);
    node = walker.nextNode();
  }
  for (const element of root.querySelectorAll?.('[aria-label], [placeholder], [title]') ?? []) {
    translateAttributes(element);
  }
}

function translateTextNode(node) {
  if (node.parentElement?.matches('script, style')) return;
  const current = node.data;
  const trimmed = current.trim();
  if (!trimmed) return;
  const source = textSources.get(node) ?? trimmed;
  textSources.set(node, source);
  const translated = translateExact(source);
  if (translated === trimmed) return;
  const leading = current.match(/^\s*/)?.[0] ?? '';
  const trailing = current.match(/\s*$/)?.[0] ?? '';
  node.data = `${leading}${translated}${trailing}`;
}

function translateAttributes(element) {
  const translatable = ['aria-label', 'placeholder', 'title'];
  let sources = attributeSources.get(element);
  if (!sources) {
    sources = new Map();
    attributeSources.set(element, sources);
  }
  for (const attribute of translatable) {
    if (!element.hasAttribute(attribute)) continue;
    const source = sources.get(attribute) ?? element.getAttribute(attribute);
    sources.set(attribute, source);
    const translated = translateExact(source);
    if (element.getAttribute(attribute) !== translated) element.setAttribute(attribute, translated);
  }
}

function translateExact(source) {
  if (locale === DEFAULT_LOCALE) return source;
  const normalized = source.replace(/\s+/g, ' ').trim();
  const direct = messages.get(normalized);
  if (direct) return direct;
  const countMatch = normalized.match(/^(\d+) (tests|trials|runs)$/);
  if (countMatch) {
    return `${interpolationValue(countMatch[1])} ${messages.get(countMatch[2]) ?? countMatch[2]}`;
  }
  return translateDynamicText(normalized) ?? source;
}

/**
 * Translate live text whose variable values were already interpolated into the
 * DOM. Catalog extraction intentionally records its stable phrases separately;
 * selecting non-overlapping longest matches keeps those phrases localizable.
 */
function translateDynamicText(source) {
  const candidates = [...messages]
    .filter(([key, value]) => key !== value && !key.includes('{') && key.length > 1 && source.includes(key))
    .sort(([left], [right]) => right.length - left.length);
  if (!candidates.length) return null;

  const occupied = new Uint8Array(source.length);
  const matches = [];
  for (const [key, value] of candidates) {
    let offset = source.indexOf(key);
    while (offset !== -1) {
      const end = offset + key.length;
      const overlaps = occupied.slice(offset, end).some(Boolean);
      const beginsInsideWord = isWord(source[offset - 1]) && isWord(key[0]);
      const endsInsideWord = isWord(key.at(-1)) && isWord(source[end]);
      if (!overlaps && !beginsInsideWord && !endsInsideWord) {
        occupied.fill(1, offset, end);
        matches.push({ offset, end, value });
      }
      offset = source.indexOf(key, offset + key.length);
    }
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

function dynamicFragment(fragment) {
  if (localeMetadata(locale).direction !== 'rtl' || !/[\p{L}\p{N}]/u.test(fragment)) return fragment;
  return interpolationValue(fragment);
}

function isWord(value) {
  return Boolean(value && /[\p{L}\p{N}]/u.test(value));
}

function renderLocaleSelector() {
  const selector = document.querySelector('[data-locale-select]');
  if (!selector) return;
  selector.innerHTML = LOCALES.map(
    (entry) =>
      `<option value="${entry.code}" lang="${entry.languageTag}" dir="${entry.direction}">${entry.label}</option>`,
  ).join('');
  selector.value = locale;
  selector.addEventListener('change', () => void setLocale(selector.value));
}

function localizeInternalLinks(root) {
  for (const link of root.querySelectorAll?.('a[data-sense6-route]') ?? []) {
    link.setAttribute('href', localeHref(link.dataset.sense6Route));
  }
}

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
