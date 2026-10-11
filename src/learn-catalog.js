import content from './learn-content.json' with { type: 'json' };
import englishUI from './learn-locales/en-ui.json' with { type: 'json' };
import { isLearnPublished } from './learn-publication.js';

const catalogs = new Map([['en', { content, ui: englishUI, reviewedDate: undefined }]]);
// Node authoring/generation and Vite runtime use the same JSON format. Drafts
// belong outside src: the release gate rejects every unlisted catalog file.
const loaders = import.meta.env?.MODE
  ? import.meta.glob(
      ['./learn-locales/*.json', '!./learn-locales/en-ui.json', '!./learn-locales/published.json'],
      { import: 'default' },
    )
  : null;

export async function prepareLearnLocale(locale) {
  if (!isLearnPublished(locale)) throw new Error(`Unpublished Learn locale: ${locale}`);
  if (catalogs.has(locale)) return;
  const key = `./learn-locales/${locale}.json`;
  const loader = loaders?.[key];
  if (loaders && !loader) throw new Error(`Missing published Learn catalog: ${locale}`);
  const catalog = loader
    ? await loader()
    : (await import(/* @vite-ignore */ key, { with: { type: 'json' } })).default;
  catalogs.set(locale, catalog);
}

export function learnCatalog(locale = 'en') {
  if (!isLearnPublished(locale) || !catalogs.has(locale)) {
    throw new Error(`Learn locale unavailable or not prepared: ${locale}`);
  }
  return catalogs.get(locale);
}
