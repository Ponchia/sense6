import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  learnSourceHash,
  validateLearnCatalog,
  validateLearnPublication,
} from '../scripts/learn-validation.mjs';
import { learnMarkup } from '../src/learn.js';
import { learnCatalog, prepareLearnLocale } from '../src/learn-catalog.js';
import english from '../src/learn-content.json' with { type: 'json' };
import englishUI from '../src/learn-locales/en-ui.json' with { type: 'json' };
import { isLearnPublished, LEARN_PUBLISHED_LOCALES, learnAlternates } from '../src/learn-publication.js';
import { LOCALES } from '../src/locale-metadata.js';

// Synthetic French software fixture, never an authored/reviewed translation.
// It lives only in an isolated temporary source tree during this test.
function frenchFixture() {
  let counter = 0;
  const translate = (value, path = '') => {
    if (typeof value === 'string') {
      if (
        /(?:\.id|\.href|\.route|\.sourceIds\.\d+|\.dateModified|\.publishedDate|\.sources\.\d+\.title)$/.test(
          path,
        )
      )
        return value;
      counter += 1;
      return `Question ${counter} : cette expérience décrit une observation sur cet appareil. Elle ne permet aucune conclusion médicale. Les études citées expliquent la méthode sans valider ce protocole dans le navigateur. La confidentialité reste essentielle.`;
    }
    if (Array.isArray(value)) return value.map((item, index) => translate(item, `${path}.${index}`));
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, translate(item, `${path}.${key}`)]),
    );
  };
  const content = translate(english);
  const ui = Object.fromEntries(
    Object.keys(englishUI).map((key) => [key, `Explication française ${++counter}`]),
  );
  ui.Learn = 'Comprendre';
  return {
    locale: 'fr',
    content,
    ui,
    sourceHash: learnSourceHash(),
    reviewedDate: '2026-10-11',
    review: {
      reviewer: 'Software fixture',
      complete: true,
      boundariesPreserved: true,
      referencesPreserved: true,
      protocolsUnchanged: true,
    },
  };
}

test('publication defaults to six English routes across twelve supported locales', async () => {
  assert.deepEqual(await validateLearnPublication(), ['en']);
  assert.deepEqual(LEARN_PUBLISHED_LOCALES, ['en']);
  assert.equal(LOCALES.length, 12);
  for (const { code } of LOCALES.filter(({ code }) => code !== 'en')) {
    assert.equal(isLearnPublished(code), false);
    await assert.rejects(prepareLearnLocale(code), /Unpublished/);
    assert.throws(() => learnCatalog(code), /unavailable/);
    assert.throws(() => learnMarkup('learn', code), /unavailable/);
  }
  assert.deepEqual(learnAlternates('learn'), []);
});

test('full catalog gate rejects missing text, source drift, placeholders and review claims', () => {
  assert.doesNotThrow(() => validateLearnCatalog(frenchFixture(), 'fr'));
  const failures = [
    [
      (c) => {
        delete c.ui.Breadcrumb;
      },
      /fields/,
    ],
    [
      (c) => {
        delete c.content.articles['hearing-range-guide'];
      },
      /fields/,
    ],
    [
      (c) => {
        c.content.articles.phantom = c.content.articles['hearing-range-guide'];
      },
      /fields/,
    ],
    [
      (c) => {
        c.ui.Breadcrumb = '';
      },
      /Missing text/,
    ],
    [
      (c) => {
        c.content.overview.title = english.overview.title;
      },
      /Untranslated/,
    ],
    [
      (c) => {
        c.content.overview.title = `Traduction : ${english.overview.title}`;
      },
      /Untranslated/,
    ],
    [
      (c) => {
        c.ui.Breadcrumb = 'TODO';
      },
      /Placeholder/,
    ],
    [
      (c) => {
        c.ui.Breadcrumb = 'Professionally translated';
      },
      /review claim/,
    ],
    [
      (c) => {
        c.review.boundariesPreserved = false;
      },
      /attested/,
    ],
    [
      (c) => {
        c.sourceHash = 'old';
      },
      /Stale/,
    ],
    [
      (c) => {
        c.reviewedDate = '2099-01-01';
      },
      /future/,
    ],
    [
      (c) => {
        c.locale = 'pt-br';
      },
      /mismatch/,
    ],
    [
      (c) => {
        c.content.articles['reaction-time-guide'].sections[0].paragraphs[0] = 'Bref.';
      },
      /Thin/,
    ],
    [
      (c) => {
        c.content.articles['reaction-time-guide'].sources[0].href = 'https://example.org';
      },
      /identity/,
    ],
    [
      (c) => {
        c.content.articles['reaction-time-guide'].sections[0].sourceIds[0] = 'invented';
      },
      /identity/,
    ],
  ];
  for (const [mutate, pattern] of failures) {
    const catalog = frenchFixture();
    mutate(catalog);
    assert.throws(() => validateLearnCatalog(catalog, 'fr'), pattern);
  }
});

test('unlisted source catalogs fail closed before emitting public paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sense6-unlisted-'));
  try {
    await writeFile(join(directory, 'fr.json'), JSON.stringify(frenchFixture()));
    await assert.rejects(validateLearnPublication(new URL(`file://${directory}/`)), /unlisted/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('isolated activation exercises generation, loader, references and reciprocal SEO without public fixtures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sense6-learn-fixture-'));
  try {
    await mkdir(join(root, 'src'));
    await mkdir(join(root, 'scripts'));
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    const modules = [
      'learn.js',
      'learn-catalog.js',
      'learn-publication.js',
      'learn-seo.js',
      'learn-timing-illustration.js',
      'learn-content.json',
      'content-dates.js',
      'routes.js',
      'locale-metadata.js',
      'site-identity.js',
      'learn-locales',
    ];
    await Promise.all(
      modules.map((name) =>
        cp(new URL(`../src/${name}`, import.meta.url), join(root, 'src', name), { recursive: true }),
      ),
    );
    await Promise.all(
      ['learn-pages.mjs', 'learn-structured-data.mjs', 'learn-validation.mjs'].map((name) =>
        cp(new URL(`../scripts/${name}`, import.meta.url), join(root, 'scripts', name)),
      ),
    );
    await writeFile(join(root, 'src/learn-locales/fr.json'), JSON.stringify(frenchFixture()));
    await writeFile(
      join(root, 'src/learn-locales/published.json'),
      JSON.stringify({ en: { label: 'Learn' }, fr: { label: 'Comprendre' } }),
    );
    const run = `
      import {writeLearnPages, learnDiscoveryLinks} from './scripts/learn-pages.mjs';
      import {learnMarkup} from './src/learn.js';
      const pages = [], paths = [];
      await writeLearnPages({ writePage: async (file, page) => pages.push({file,...page}), canonicalPaths: paths, routeStyles: new Map([['learn','learn.css']]) });
      export const result = {pages, paths, links:learnDiscoveryLinks('https://sense6.net'), equal:pages.every(p=>p.main===learnMarkup(p.route,p.locale))};
    `;
    await writeFile(join(root, 'run.mjs'), run);
    const { result } = await import(new URL(`file://${root}/run.mjs`));
    assert.equal(result.pages.length, 12);
    assert.equal(result.paths.length, 12);
    assert.equal(result.equal, true);
    assert.match(result.links, /\/fr\/hearing-range-guide\//);
    assert.doesNotMatch(result.links, /\/ar\//);
    for (const page of result.pages) {
      assert.equal((page.alternates.match(/hreflang=/g) ?? []).length, 2);
      assert.doesNotMatch(page.alternates, /hreflang="ar"|x-default/);
      const record = page.structuredData['@graph'][0];
      assert.equal(record.inLanguage, page.locale);
      assert.equal(record.url, `https://sense6.net${page.path}`);
      assert.equal(record.dateModified, page.lastModified);
      if (page.locale !== 'fr') continue;
      assert.match(page.main, /data-learn-locale="fr"/);
      assert.doesNotMatch(page.main, /href="\/en\/|>Breadcrumb<|>On this page<|>By </);
      assert.equal(page.languageTag, 'fr');
      assert.equal(page.direction, 'ltr');
      for (const source of english.articles[page.route]?.sources ?? []) {
        if (source.href.startsWith('https://')) assert.ok(page.main.includes(source.href));
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
