import { learnMetadata, learnPage } from './learn.js';
import { learnCatalog } from './learn-catalog.js';
import { learnPublicationDate } from './learn-publication.js';
import { localeMetadata } from './locale-metadata.js';
import { LEARN_ROUTES, SITE_ORIGIN } from './routes.js';
import { CREATOR_PROFILE_URL } from './site-identity.js';

const ORIGIN = SITE_ORIGIN;

/** Source-backed, original English articles. No studies here validate Sense6 itself. */
export function learnPageData(route, locale = 'en') {
  const { ui } = learnCatalog(locale);
  if (!LEARN_ROUTES.includes(route)) throw new Error('Unknown Learn page');
  const page = learnPage(route, locale);
  const url = `${ORIGIN}/${locale}/${route}/`;
  const entries = [
    { '@type': 'ListItem', position: 1, name: 'Sense6', item: `${ORIGIN}/${locale}/` },
    { '@type': 'ListItem', position: 2, name: ui.Learn, item: `${ORIGIN}/${locale}/learn/` },
  ];
  if (route !== 'learn') {
    entries.push({ '@type': 'ListItem', position: 3, name: page.title, item: url });
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      route === 'learn'
        ? {
            '@type': 'CollectionPage',
            '@id': `${url}#page`,
            url,
            name: page.title,
            description: page.description,
            inLanguage: localeMetadata(locale).languageTag,
            dateModified: learnMetadata(route, locale).dateModified,
            author: learnCreatorData(),
            isPartOf: { '@id': `${ORIGIN}/#website` },
          }
        : {
            '@type': 'Article',
            '@id': `${url}#article`,
            url,
            headline: page.title,
            description: page.description,
            inLanguage: localeMetadata(locale).languageTag,
            // Translation first-publication dates differ from their English source.
            datePublished: locale === 'en' ? page.publishedDate : learnPublicationDate(locale),
            dateModified: page.dateModified,
            author: learnCreatorData(),
            publisher: { '@type': 'Organization', name: 'Sense6', url: ORIGIN },
            mainEntityOfPage: { '@type': 'WebPage', '@id': `${url}#page`, url },
            image: new URL(learnMetadata(route, locale).socialImage, ORIGIN).href,
            isAccessibleForFree: true,
            isPartOf: { '@id': `${ORIGIN}/#website` },
            citation: page.sources
              .filter((source) => source.href.startsWith('https://'))
              .map((source) => source.href),
          },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: entries,
      },
    ],
  };
}

function learnCreatorData() {
  return {
    '@type': 'Person',
    '@id': ORIGIN + '/#creator',
    name: 'Zeno',
    url: CREATOR_PROFILE_URL,
    sameAs: [CREATOR_PROFILE_URL],
  };
}
