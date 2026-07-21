import { writeFile } from 'node:fs/promises';

const commit = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(commit ?? '')) {
  throw new Error('Usage: node scripts/write-build-metadata.mjs <40-character-git-sha>');
}

await writeFile(new URL('../dist/build-meta.json', import.meta.url), `${JSON.stringify({ commit })}\n`);
