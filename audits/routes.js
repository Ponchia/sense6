import { EXAMS } from '../src/exams/registry.js';
import { LEARN_PUBLISHED_LOCALES } from '../src/learn-publication.js';
import { LOCALES } from '../src/locales.js';
import { ENGLISH_ONLY_ROUTES, LEARN_ROUTES, routePath, UTILITY_ROUTES } from '../src/routes.js';

export const SITE_ROUTES = Object.freeze([
  '/',
  ...ENGLISH_ONLY_ROUTES.map((route) => routePath('en', route)),
  ...LEARN_PUBLISHED_LOCALES.flatMap((locale) => LEARN_ROUTES.map((route) => routePath(locale, route))),
  ...LOCALES.flatMap(({ code }) => [
    routePath(code),
    ...EXAMS.map(({ route }) => routePath(code, route)),
    ...UTILITY_ROUTES.map((route) => routePath(code, route)),
  ]),
]);

export const SEARCH_ROUTES = Object.freeze([
  '/',
  ...ENGLISH_ONLY_ROUTES.map((route) => routePath('en', route)),
  ...LEARN_PUBLISHED_LOCALES.flatMap((locale) => LEARN_ROUTES.map((route) => routePath(locale, route))),
  ...LOCALES.flatMap(({ code }) => [
    routePath(code),
    ...EXAMS.map(({ route }) => routePath(code, route)),
    routePath(code, 'about'),
  ]),
]);

export const REPRESENTATIVE_ROUTES = Object.freeze([
  '/',
  '/en/',
  '/en/browser-timing-explorer/',
  '/en/learn/',
  '/en/color-blindness-guide/',
  ...EXAMS.map(({ route }) => routePath('en', route)),
  ...UTILITY_ROUTES.map((route) => routePath('en', route)),
  '/ar/about/',
  '/hi/about/',
  '/ja/about/',
]);

export const SEARCH_REPRESENTATIVE_ROUTES = Object.freeze([
  '/',
  '/en/',
  '/en/browser-timing-explorer/',
  '/en/learn/',
  '/en/tetrachromacy-guide/',
  '/en/color-blindness-guide/',
  '/en/hearing-range-guide/',
  '/en/visual-acuity-guide/',
  ...EXAMS.map(({ route }) => routePath('en', route)),
  '/en/about/',
  '/ar/about/',
  '/hi/about/',
  '/ja/about/',
]);
