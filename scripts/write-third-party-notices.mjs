import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DOTO_FILES = [400, 500, 600, 700, 800, 900].map((weight) => `doto-${weight}.woff2`);
const FONT_EXTENSION = /\.(?:woff2?|ttf|otf|eot)$/i;

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readNotice(path, markers) {
  const text = await readFile(path, 'utf8');
  if (!markers.every((marker) => text.includes(marker))) {
    throw new Error(`License notice is empty or changed; review attribution: ${path}`);
  }
  return text;
}

function fingerprint(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Accompany the built software and fonts with their actual license texts.
 * New runtime dependencies or font bytes require an explicit inventory review.
 */
export async function writeThirdPartyNotices(repository = ROOT) {
  const ui = join(repository, 'node_modules', '@ponchia', 'ui');
  const dist = join(repository, 'dist');
  const [project, dependency, lock] = await Promise.all([
    readJson(join(repository, 'package.json')),
    readJson(join(ui, 'package.json')),
    readJson(join(repository, 'package-lock.json')),
  ]);
  if (
    Object.keys(project.dependencies ?? {})
      .sort()
      .join(',') !== '@ponchia/ui' ||
    Object.keys(dependency.dependencies ?? {}).length !== 0
  ) {
    throw new Error('Runtime dependencies changed; review the third-party notice inventory.');
  }
  if (project.license !== 'MIT' || dependency.name !== '@ponchia/ui' || dependency.license !== 'MIT') {
    throw new Error('Package license metadata changed; review the third-party notice inventory.');
  }
  if (!dependency.version || dependency.version !== lock.packages?.['node_modules/@ponchia/ui']?.version) {
    throw new Error('Installed @ponchia/ui does not match the lockfile; run npm ci before building.');
  }

  const [projectLicense, uiLicense, dotoLicense, sourceFonts, outputFiles] = await Promise.all([
    readNotice(join(repository, 'LICENSE'), ['MIT License', 'Copyright', 'Permission is hereby granted']),
    readNotice(join(ui, 'LICENSE'), ['MIT License', 'Copyright', 'Permission is hereby granted']),
    readNotice(join(ui, 'fonts', 'OFL.txt'), [
      'The Doto Project Authors',
      'SIL OPEN FONT LICENSE Version 1.1',
    ]),
    Promise.all(DOTO_FILES.map((name) => readFile(join(ui, 'fonts', name)))),
    readdir(dist, { recursive: true }),
  ]);
  const fonts = outputFiles.filter((name) => FONT_EXTENSION.test(name)).sort();
  if (fonts.length === 0) {
    throw new Error('No emitted fonts found; run the Vite build before generating third-party notices.');
  }
  const knownFonts = new Set(sourceFonts.map(fingerprint));
  for (const name of fonts) {
    if (!knownFonts.has(fingerprint(await readFile(join(dist, name))))) {
      throw new Error(
        `Unreviewed emitted font: ${name}. Update the font and license inventory before release.`,
      );
    }
  }

  const content = [
    'Sense6 licenses and third-party notices',
    'Generated from the installed dependency and its lockfile. Keep this file with the built site.',
    `Sense6 — MIT\n\n${projectLicense}`,
    `@ponchia/ui ${dependency.version} — MIT\n\n${uiLicense}`,
    `Doto — SIL Open Font License 1.1\nEmitted font files:\n${fonts.map((name) => `- ${name}`).join('\n')}\n\n${dotoLicense}`,
  ].join('\n\n');
  const output = join(dist, 'third-party-notices.txt');
  await writeFile(output, `${content}\n`);
  return { output, fonts };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { fonts } = await writeThirdPartyNotices();
  console.log(`Third-party notices written · @ponchia/ui and ${fonts.length} Doto font files`);
}
