import { DEFAULT_LOCALE, LOCALE_CODES, LOCALES, loadMessages } from './locales.js';

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
  document.documentElement.lang = locale;
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
  if (notify) await localeChangeHandler?.(locale);
  return true;
}

export function t(source, values = {}) {
  const translated = messages.get(source) ?? source;
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{${key}}`, String(value)),
    translated,
  );
}

export function formatNumber(value, options) {
  return new Intl.NumberFormat(locale, options).format(value);
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
  return countMatch ? `${countMatch[1]} ${t(countMatch[2])}` : source;
}

function renderLocaleSelector() {
  const selector = document.querySelector('[data-locale-select]');
  if (!selector) return;
  selector.innerHTML = LOCALES.map((entry) => `<option value="${entry.code}">${entry.label}</option>`).join(
    '',
  );
  selector.value = locale;
  selector.addEventListener('change', () => void setLocale(selector.value));
}

function localizeInternalLinks(root) {
  for (const link of root.querySelectorAll?.('a[data-sense6-route]') ?? []) {
    link.setAttribute('href', localeHref(link.dataset.sense6Route));
  }
}

export function normalizeLocale(value) {
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
