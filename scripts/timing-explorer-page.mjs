import { CONTENT_DATES } from '../src/content-dates.js';
import {
  TIMING_EXPLORER_METADATA,
  TIMING_EXPLORER_ROUTE,
  timingExplorerMarkup,
} from '../src/timing-explorer.js';
import { timingExplorerPageData } from '../src/timing-explorer-seo.js';

/** Publish one complete English resource without inventing translated routes. */
export async function writeTimingExplorerPage({ writePage, canonicalPaths, routeStyles }) {
  const path = `/en/${TIMING_EXPLORER_ROUTE}/`;
  canonicalPaths.push({ path, lastModified: CONTENT_DATES.timingExplorer });
  await writePage(`en/${TIMING_EXPLORER_ROUTE}/index.html`, {
    locale: 'en',
    languageTag: 'en',
    direction: 'ltr',
    route: TIMING_EXPLORER_ROUTE,
    path,
    ...TIMING_EXPLORER_METADATA,
    lastModified: CONTENT_DATES.timingExplorer,
    main: timingExplorerMarkup(),
    stylesheet: routeStyles.get('timing-explorer'),
    alternates: '',
    structuredData: timingExplorerPageData(),
  });
}
