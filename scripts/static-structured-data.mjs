import { ABOUT_DATE_MODIFIED } from '../src/about.js';
import { sourcesFor } from '../src/exams/sources.js';
import { LOCALES } from '../src/locales.js';
import { SITE_ORIGIN } from '../src/routes.js';

export const SITE_DATE_MODIFIED = '2026-07-22';

const ORIGIN = SITE_ORIGIN;

export function websiteData(
  locale,
  description = 'Private, device-relative browser perception experiments.',
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${ORIGIN}/#website`,
    name: 'Sense6',
    alternateName: 'Sense6 browser perception lab',
    url: ORIGIN,
    inLanguage: locale,
    description,
    image: `${ORIGIN}/social/sense6.png`,
    dateModified: SITE_DATE_MODIFIED,
    creator: creatorData(),
  };
}

export function aboutData(copy, locale, path) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${ORIGIN}${path}#page`,
        url: `${ORIGIN}${path}`,
        name: copy.pageTitle,
        description: copy.description,
        inLanguage: locale,
        dateModified: ABOUT_DATE_MODIFIED,
        about: { '@id': `${ORIGIN}/#website` },
        mainEntity: { '@id': `${ORIGIN}/#website` },
      },
      {
        '@type': 'WebSite',
        '@id': `${ORIGIN}/#website`,
        name: 'Sense6',
        alternateName: 'Sense6 browser perception lab',
        url: ORIGIN,
        description: 'A privacy-first collection of experimental browser perception tests.',
        inLanguage: LOCALES.map(({ languageTag }) => languageTag),
        creator: { '@id': `${ORIGIN}/#creator` },
      },
      creatorData(),
    ],
  };
}

export function examData(definition, locale, path, tr) {
  const url = `${ORIGIN}${path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${url}#application`,
        name: definition.name,
        url,
        description: tr(definition.blurb),
        applicationCategory: 'EducationalApplication',
        isAccessibleForFree: true,
        inLanguage: locale,
        image: `${ORIGIN}/social/${definition.id}.png`,
        dateModified: SITE_DATE_MODIFIED,
        creator: creatorData(),
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${ORIGIN}/#website`,
          name: 'Sense6',
          url: ORIGIN,
        },
        citation: sourcesFor(definition.id).map(({ href }) => href),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: tr('All tests'),
            item: `${ORIGIN}/${path.split('/')[1]}/`,
          },
          { '@type': 'ListItem', position: 2, name: definition.name, item: url },
        ],
      },
    ],
  };
}

export function webpageData(name, description, locale, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: `${ORIGIN}${path}`,
    inLanguage: locale,
  };
}

function creatorData() {
  return {
    '@type': 'Person',
    '@id': `${ORIGIN}/#creator`,
    name: 'Zeno',
    url: 'https://personal.brontolotto.observer',
  };
}
