import { learnMarkup, learnMetadata, learnPage } from '../src/learn.js';
import { LEARN_ROUTES } from '../src/routes.js';
import { learnPageData } from './learn-structured-data.mjs';

/**
 * Produce indexable original-English reference pages using the existing
 * canonical static output writer. The translation system does not invent
 * alternatives for content that has not been reviewed in other languages.
 */
export async function writeLearnPages({ writePage, canonicalPaths, routeStyles }) {
  const stylesheet = routeStyles.get('learn');
  if (!stylesheet) throw new Error('Missing generated stylesheet for Learn');
  for (const route of LEARN_ROUTES) {
    const details = learnMetadata(route);
    const path = `/en/${route}/`;
    canonicalPaths.push({ path, lastModified: details.dateModified });
    await writePage(`en/${route}/index.html`, {
      locale: 'en',
      languageTag: 'en',
      direction: 'ltr',
      route,
      path,
      title: details.title,
      description: details.description,
      socialImage: details.socialImage,
      socialImageAlt: details.socialImageAlt,
      main: learnMarkup(route),
      stylesheet,
      alternates: '',
      structuredData: learnPageData(route),
    });
  }
}

/** Include every original English Learn guide in the crawler text index. */
export function learnDiscoveryLinks(origin) {
  return LEARN_ROUTES.map((route) => {
    const label = route === 'learn' ? 'Perception, explained — Learn' : learnPage(route).title;
    return `- [${label}](${origin}/en/${route}/)`;
  }).join('\n');
}
