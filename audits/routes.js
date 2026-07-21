import { EXAMS } from '../src/exams/registry.js';
import { LOCALES } from '../src/locales.js';

export const SITE_ROUTES = Object.freeze([
  '/',
  ...LOCALES.flatMap(({ code }) => [
    `/${code}/`,
    ...EXAMS.map(({ route }) => `/${code}/${route}/`),
    `/${code}/about/`,
    `/${code}/journal/`,
    `/${code}/privacy/`,
  ]),
]);

export const REPRESENTATIVE_ROUTES = Object.freeze([
  '/',
  '/en/',
  ...EXAMS.map(({ route }) => `/en/${route}/`),
  '/en/about/',
  '/en/journal/',
  '/en/privacy/',
  '/ar/about/',
  '/hi/about/',
  '/ja/about/',
]);
