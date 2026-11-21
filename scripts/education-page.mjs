import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EDUCATION_RESOURCE } from '../src/education-resource.js';
import { recordContentFingerprint } from './content-fingerprints.mjs';

/**
 * Fingerprint the standalone teaching page copied by Vite from public/.
 * Its published sitemap lastmod must advance whenever the actual copy changes.
 * @param {string} dist
 */
export async function recordEducationResourceFingerprint(dist) {
  const html = await readFile(join(dist, 'education/browser-reaction-time/index.html'), 'utf8');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1];
  if (!title || !description || !main) {
    throw new Error('Standalone classroom lesson requires a title, description and main content');
  }
  recordContentFingerprint({ ...EDUCATION_RESOURCE, title, description, main });
}
