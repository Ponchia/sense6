import { EXAMS } from '../src/exams/registry.js';
import { LOCALES } from '../src/locales.js';
import { routePath, UTILITY_ROUTES } from '../src/routes.js';

export const SITE_ROUTES = Object.freeze([
  '/',
  ...LOCALES.flatMap(({ code }) => [
    routePath(code),
    ...EXAMS.map(({ route }) => routePath(code, route)),
    ...UTILITY_ROUTES.map((route) => routePath(code, route)),
  ]),
]);

export const REPRESENTATIVE_ROUTES = Object.freeze([
  '/',
  '/en/',
  ...EXAMS.map(({ route }) => routePath('en', route)),
  ...UTILITY_ROUTES.map((route) => routePath('en', route)),
  '/ar/about/',
  '/hi/about/',
  '/ja/about/',
]);
