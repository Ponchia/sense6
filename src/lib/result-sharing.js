const ORIGIN = 'https://sense6.net';

/** @typedef {{ share?: (data: ShareData) => Promise<void>, clipboard?: { writeText: (value: string) => Promise<void> } }} SharingNavigator */

/**
 * @param {string} route
 * @param {string} locale
 */
export function canonicalResultUrl(route, locale) {
  if (!/^[a-z0-9-]+$/.test(route) || !/^[a-z0-9-]+$/.test(locale)) {
    throw new TypeError('Result routes and locales must be URL-safe slugs');
  }
  return new URL(`/${locale}/${route}/`, ORIGIN).href;
}

/** @param {SharingNavigator | undefined} [browserNavigator] */
export function canShareResult(browserNavigator = globalThis.navigator) {
  return typeof browserNavigator?.share === 'function';
}

/**
 * @param {(source: string) => string} translate
 * @param {string} [copyLabel]
 * @param {SharingNavigator | undefined} [browserNavigator]
 */
export function resultActionLabel(
  translate,
  copyLabel = 'Copy result summary',
  browserNavigator = globalThis.navigator,
) {
  return translate(canShareResult(browserNavigator) ? 'Share result' : copyLabel);
}

/**
 * Use the platform share sheet when it exists, otherwise copy the complete,
 * self-attributing result summary. A cancelled share is intentionally silent.
 *
 * @param {{ title: string, summary: string, route: string, locale: string, browserNavigator?: SharingNavigator }} options
 * @returns {Promise<'shared' | 'copied' | 'cancelled'>}
 */
export async function shareOrCopyResult({
  title,
  summary,
  route,
  locale,
  browserNavigator = globalThis.navigator,
}) {
  const url = canonicalResultUrl(route, locale);
  const share = browserNavigator?.share;
  if (typeof share === 'function') {
    try {
      await share.call(browserNavigator, { title, text: summary, url });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }

  if (!browserNavigator?.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
  await browserNavigator.clipboard.writeText(`${summary}\n${url}`);
  return 'copied';
}
