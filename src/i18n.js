import { DEFAULT_LOCALE, LOCALE_CODES, LOCALES, MESSAGES } from './locales.js';

const STORAGE_KEY = 'sense6:locale';
const textSources = new WeakMap();
const attributeSources = new WeakMap();
let locale = DEFAULT_LOCALE;
let observer = null;
let localeChangeHandler = null;

export function initializeI18n({ initialLocale, onLocaleChange } = {}) {
  localeChangeHandler = onLocaleChange ?? null;
  locale = normalizeLocale(initialLocale) ?? storedLocale() ?? browserLocale() ?? DEFAULT_LOCALE;
  document.documentElement.lang = locale;
  renderLocaleSelector();
  translateTree(document.documentElement);
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) translateTree(node);
      if (mutation.type === 'attributes') translateAttributes(mutation.target);
    }
    localizeInternalLinks(document);
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['aria-label', 'placeholder', 'title', 'content'],
    childList: true,
    subtree: true,
  });
  localizeInternalLinks(document);
  return locale;
}

export function getLocale() {
  return locale;
}

export function setLocale(nextLocale, { notify = true } = {}) {
  const normalized = normalizeLocale(nextLocale);
  if (!normalized || normalized === locale) return false;
  locale = normalized;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Language still applies for this page when storage is unavailable.
  }
  const selector = document.querySelector('[data-locale-select]');
  if (selector) selector.value = locale;
  translateTree(document.documentElement);
  localizeInternalLinks(document);
  if (notify) localeChangeHandler?.(locale);
  return true;
}

export function t(source, values = {}) {
  const translated = MESSAGES[locale]?.get(source) ?? source;
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{${key}}`, String(value)),
    translated,
  );
}

export function formatNumber(value, options) {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function localeHref(route = '', targetLocale = locale) {
  return `#/${targetLocale}/${route}`;
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
  for (const element of root.querySelectorAll?.('[aria-label], [placeholder], [title], meta[content]') ?? [])
    translateAttributes(element);
}

export function teardownI18n() {
  observer?.disconnect();
  observer = null;
}

function translateTextNode(node) {
  if (node.parentElement?.matches('script, style')) return;
  const current = node.data;
  const trimmed = current.trim();
  if (!trimmed) return;
  const source = textSources.get(node) ?? trimmed;
  textSources.set(node, source);
  const translated = translateDynamic(source);
  if (translated === trimmed) return;
  const leading = current.match(/^\s*/)?.[0] ?? '';
  const trailing = current.match(/\s*$/)?.[0] ?? '';
  node.data = `${leading}${translated}${trailing}`;
}

function translateAttributes(element) {
  const translatable = ['aria-label', 'placeholder', 'title', 'content'];
  let sources = attributeSources.get(element);
  if (!sources) {
    sources = new Map();
    attributeSources.set(element, sources);
  }
  for (const attribute of translatable) {
    if (!element.hasAttribute(attribute)) continue;
    const source = sources.get(attribute) ?? element.getAttribute(attribute);
    sources.set(attribute, source);
    const translated = translateDynamic(source);
    if (element.getAttribute(attribute) !== translated) element.setAttribute(attribute, translated);
  }
}

function translateDynamic(source) {
  if (locale === DEFAULT_LOCALE) return source;
  const normalized = source.replace(/\s+/g, ' ').trim();
  const messages = MESSAGES[locale];
  const direct = messages?.get(normalized);
  if (direct) return direct;
  const countMatch = normalized.match(/^(\d+) (tests|trials|runs)$/);
  if (countMatch) return `${countMatch[1]} ${t(countMatch[2])}`;
  const candidates = [];
  for (const [english, localized] of messages?.entries() ?? []) {
    let start = normalized.indexOf(english);
    while (start !== -1) {
      const end = start + english.length;
      const bounded =
        english.length >= 8 ||
        (!isLetterOrNumber(normalized[start - 1]) && !isLetterOrNumber(normalized[end]));
      if (bounded) candidates.push({ start, end, localized });
      start = normalized.indexOf(english, start + 1);
    }
  }
  const selected = [];
  for (const candidate of candidates.sort(
    (left, right) => right.end - right.start - (left.end - left.start) || left.start - right.start,
  )) {
    if (selected.every((entry) => candidate.end <= entry.start || candidate.start >= entry.end)) {
      selected.push(candidate);
    }
  }
  if (!selected.length) return source;
  selected.sort((left, right) => left.start - right.start);
  let cursor = 0;
  let translated = '';
  for (const entry of selected) {
    translated += normalized.slice(cursor, entry.start) + entry.localized;
    cursor = entry.end;
  }
  translated += normalized.slice(cursor);
  return translated;
}

function isLetterOrNumber(character) {
  return character ? /[\p{L}\p{N}]/u.test(character) : false;
}

function renderLocaleSelector() {
  const selector = document.querySelector('[data-locale-select]');
  if (!selector) return;
  selector.innerHTML = LOCALES.map(
    (entry) => `<option value="${entry.code}">${entry.short} · ${entry.label}</option>`,
  ).join('');
  selector.value = locale;
  selector.addEventListener('change', () => setLocale(selector.value));
}

function localizeInternalLinks(root) {
  for (const link of root.querySelectorAll?.('a[href^="#/"]') ?? []) {
    const raw = link.getAttribute('href').replace(/^#\//, '');
    const parts = raw.split('/').filter(Boolean);
    const route = LOCALE_CODES.has(parts[0]) ? parts.slice(1).join('/') : parts.join('/');
    const next = localeHref(route);
    if (link.getAttribute('href') !== next) link.setAttribute('href', next);
  }
}

function normalizeLocale(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().split('-')[0];
  return LOCALE_CODES.has(normalized) ? normalized : null;
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
