import { CONTENT_DATES } from '../src/content-dates.js';
import { learnPage } from '../src/learn.js';
import { LEARN_ROUTES, SITE_ORIGIN } from '../src/routes.js';
import { CREATOR_PROFILE_URL } from '../src/site-identity.js';

const ORIGIN = SITE_ORIGIN;

/** Source-backed, original English articles. No studies here validate Sense6 itself. */
export function learnPageData(route) {
  if (!LEARN_ROUTES.includes(route)) throw new Error('Unknown Learn page');
  const page = learnPage(route);
  const url = `${ORIGIN}/en/${route}/`;
  const entries = [
    { '@type': 'ListItem', position: 1, name: 'Sense6', item: `${ORIGIN}/en/` },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: `${ORIGIN}/en/learn/` },
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
            inLanguage: 'en',
            dateModified: CONTENT_DATES.learn,
            author: learnCreatorData(),
            isPartOf: { '@id': `${ORIGIN}/#website` },
          }
        : {
            '@type': 'Article',
            '@id': `${url}#article`,
            url,
            headline: page.title,
            description: page.description,
            inLanguage: 'en',
            datePublished: CONTENT_DATES.learn,
            dateModified: CONTENT_DATES.learn,
            author: learnCreatorData(),
            publisher: { '@type': 'Organization', name: 'Sense6', url: ORIGIN },
            mainEntityOfPage: { '@type': 'WebPage', '@id': `${url}#page`, url },
            image: `${ORIGIN}/social/sense6.png`,
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
