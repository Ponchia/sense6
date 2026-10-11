import { learnMarkup, learnMetadata, learnPage } from '../src/learn.js';
import { prepareLearnLocale } from '../src/learn-catalog.js';
import { LEARN_PUBLISHED_LOCALES, learnAlternates } from '../src/learn-publication.js';
import { localeMetadata } from '../src/locale-metadata.js';
import { LEARN_ROUTES } from '../src/routes.js';
import { learnPageData } from './learn-structured-data.mjs';
import { validateLearnPublication } from './learn-validation.mjs';

/** Generate only complete, explicitly published locale catalogs. */
export async function writeLearnPages({ writePage, canonicalPaths, routeStyles }) {
  await validateLearnPublication();
  const stylesheet = routeStyles.get('learn');
  if (!stylesheet) throw new Error('Missing generated stylesheet for Learn');
  for (const locale of LEARN_PUBLISHED_LOCALES) {
    await prepareLearnLocale(locale);
    const { languageTag, direction } = localeMetadata(locale);
    for (const route of LEARN_ROUTES) {
      const details = learnMetadata(route, locale);
      const path = `/${locale}/${route}/`;
      canonicalPaths.push({ path, lastModified: details.dateModified });
      await writePage(`${locale}/${route}/index.html`, {
        locale,
        languageTag,
        direction,
        route,
        path,
        title: details.title,
        description: details.description,
        socialImage: details.socialImage,
        socialImageAlt: details.socialImageAlt,
        lastModified: details.dateModified,
        main: learnMarkup(route, locale),
        stylesheet,
        alternates: learnAlternates(route)
          .map(({ languageTag: tag, href }) => `<link rel="alternate" hreflang="${tag}" href="${href}">`)
          .join('\n    '),
        structuredData: learnPageData(route, locale),
      });
    }
  }
}

/** Catalogs are prepared by writeLearnPages before discovery output. */
export function learnDiscoveryLinks(origin) {
  return LEARN_PUBLISHED_LOCALES.flatMap((locale) =>
    LEARN_ROUTES.map((route) => {
      const label =
        locale === 'en' && route === 'learn'
          ? 'Perception, explained — Learn'
          : learnPage(route, locale).title;
      return `- [${label}](${origin}/${locale}/${route}/)`;
    }),
  ).join('\n');
}
