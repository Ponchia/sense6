import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = resolve(ROOT, 'dist');
const ORIGIN = 'https://sense6.net';
const htmlFiles = (await walk(DIST)).filter((file) => file.endsWith('.html'));
const htmlCache = new Map();
const errors = [];
let checked = 0;

for (const sourceFile of htmlFiles) {
  const html = await readFile(sourceFile, 'utf8');
  const sourcePath = routeForFile(sourceFile);
  for (const match of html.matchAll(/<(?:a|link|script|img|source)\b[^>]*\b(?:href|src)=(['"])(.*?)\1/gi)) {
    const raw = decodeAttribute(match[2]);
    if (!raw || /^(?:data|mailto|tel|javascript):/i.test(raw)) continue;
    let url;
    try {
      url = new URL(raw, `${ORIGIN}${sourcePath}`);
    } catch {
      errors.push(`${sourcePath}: invalid URL ${JSON.stringify(raw)}`);
      continue;
    }
    if (url.origin !== ORIGIN) continue;
    checked += 1;
    const targetFile = fileForPath(url.pathname);
    if (!(await exists(targetFile))) {
      errors.push(`${sourcePath}: ${raw} resolves to missing ${relative(DIST, targetFile)}`);
      continue;
    }
    if (url.hash && targetFile.endsWith('.html')) {
      const fragment = decodeURIComponent(url.hash.slice(1));
      const targetHtml = await cachedRead(targetFile);
      const anchors = new Set(
        [...targetHtml.matchAll(/\b(?:id|name)=(['"])(.*?)\1/gi)].map((anchor) => decodeAttribute(anchor[2])),
      );
      if (!anchors.has(fragment)) errors.push(`${sourcePath}: ${raw} has no matching fragment`);
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Internal link audit failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
}

console.log(`Validated ${checked} internal URL references across ${htmlFiles.length} HTML files.`);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      }),
    )
  ).flat();
}

function routeForFile(file) {
  const path = relative(DIST, file).split(sep).join('/');
  if (path === 'index.html') return '/';
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length)}`;
  return `/${path}`;
}

function fileForPath(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, '');
  const relativePath = !decoded || pathname.endsWith('/') ? `${decoded}index.html` : decoded;
  const target = resolve(DIST, relativePath);
  if (target !== DIST && !target.startsWith(`${DIST}${sep}`)) {
    throw new Error(`Internal URL escapes dist: ${pathname}`);
  }
  return target;
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function cachedRead(file) {
  if (!htmlCache.has(file)) htmlCache.set(file, await readFile(file, 'utf8'));
  return htmlCache.get(file);
}

function decodeAttribute(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}
