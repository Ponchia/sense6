import { readFile } from 'node:fs/promises';
import { learnSourceHash, validateLearnCatalog, validateLearnPublication } from './learn-validation.mjs';

const [file, locale] = process.argv.slice(2);
if (file === '--source-hash') {
  console.log(learnSourceHash());
} else if (file) {
  if (!locale) throw new Error('Usage: npm run learn:check -- /absolute/draft.json locale');
  validateLearnCatalog(JSON.parse(await readFile(file, 'utf8')), locale);
  console.log(`Complete Learn draft: ${locale} (not published)`);
} else {
  console.log(`Learn publication validated: ${(await validateLearnPublication()).join(', ')}`);
}
