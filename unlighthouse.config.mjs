import { chromium } from '@playwright/test';
import { REPRESENTATIVE_ROUTES, SITE_ROUTES } from './audits/routes.js';

const site = process.env.UNLIGHTHOUSE_SITE ?? 'http://127.0.0.1:4174';
const routes = process.env.FULL_SITE_AUDIT === '1' ? SITE_ROUTES : REPRESENTATIVE_ROUTES;

export default {
  site,
  cache: false,
  outputPath: process.env.UNLIGHTHOUSE_OUTPUT_PATH ?? '.unlighthouse',
  urls: routes.map((route) => new URL(route, site).href),
  scanner: {
    crawler: false,
    device: 'mobile',
    ignoreI18nPages: false,
    maxRoutes: false,
    robotsTxt: false,
    samples: 1,
    sitemap: false,
    throttle: true,
  },
  ci: {
    budget: {
      accessibility: 100,
      'best-practices': 100,
      performance: 90,
      seo: 100,
    },
  },
  puppeteerOptions: {
    args: ['--no-sandbox'],
    executablePath: chromium.executablePath(),
    headless: true,
  },
  puppeteerClusterOptions: { maxConcurrency: 1 },
};
