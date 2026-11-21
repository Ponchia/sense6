import { CONTENT_DATES } from './content-dates.js';
import { SITE_ORIGIN } from './routes.js';
import { CREATOR_PROFILE_URL, CREATOR_WEBSITE_URL } from './site-identity.js';
import { TIMING_EXPLORER_METADATA, TIMING_EXPLORER_ROUTE } from './timing-explorer.js';

/** Describe the visible educational resource without implying a device benchmark. */
export function timingExplorerPageData() {
  const url = `${SITE_ORIGIN}/en/${TIMING_EXPLORER_ROUTE}/`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#page`,
        url,
        name: TIMING_EXPLORER_METADATA.title,
        description: TIMING_EXPLORER_METADATA.description,
        inLanguage: 'en',
        datePublished: TIMING_EXPLORER_METADATA.datePublished,
        dateModified: CONTENT_DATES.timingExplorer,
        isAccessibleForFree: true,
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        author: {
          '@type': 'Person',
          '@id': `${SITE_ORIGIN}/#creator`,
          name: 'Zeno',
          url: CREATOR_WEBSITE_URL,
          sameAs: [CREATOR_PROFILE_URL],
        },
        image: `${SITE_ORIGIN}${TIMING_EXPLORER_METADATA.socialImage}`,
        relatedLink: `${SITE_ORIGIN}/en/reaction-time-guide/`,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Sense6', item: `${SITE_ORIGIN}/en/` },
          { '@type': 'ListItem', position: 2, name: 'Learn', item: `${SITE_ORIGIN}/en/learn/` },
          { '@type': 'ListItem', position: 3, name: 'Browser Timing Explorer', item: url },
        ],
      },
    ],
  };
}
