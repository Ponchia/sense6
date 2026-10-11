# Learn locale publication

Only locales in [published.json](published.json) have public Learn pages. The
current manifest contains English, Italian, Spanish, German, French, European
Portuguese, Brazilian Portuguese, Arabic, Japanese, Korean, Hindi and Simplified
Chinese: 72 Learn pages among 157 canonical sitemap URLs. The initial English-only baseline had 91. Supporting a language in the experiment UI does not publish a
Learn translation. Canonical locale codes come from
[locale-metadata.js](../locale-metadata.js): `en`, `it`, `de`, `fr`, `es`, `pt`,
`pt-br`, `ar`, `ja`, `ko`, `hi`, and `zh-hans`. Portuguese variants have separate
catalogs and language tags. Arabic uses `lang="ar" dir="rtl"`.

## Author a complete catalog

Keep drafts outside `src`, for example `/tmp/sense6-fr.json`. The build rejects
unlisted JSON catalogs in this directory; Vite emits catalogs as separate lazy
chunks, so this directory must never hold private or incomplete drafts.
English article prose remains in [learn-content.json](../learn-content.json).
Do not replace it with a translation. English Learn template copy lives in
[en-ui.json](en-ui.json), including the hypothetical timing illustration.

A translation is one JSON object with these exact fields:

```json
{
  "locale": "fr",
  "sourceHash": "SHA-256 emitted by the source-hash command",
  "reviewedDate": "YYYY-MM-DD",
  "review": {
    "reviewer": "Actual responsible reviewer",
    "complete": true,
    "boundariesPreserved": true,
    "protocolsUnchanged": true,
    "referencesPreserved": true
  },
  "content": { "overview": {}, "articles": {} },
  "ui": {}
}
```

The empty objects above illustrate the envelope; they are rejected by the
validator. Copy the complete **shape** of the current English content into
`content` and all keys from `en-ui.json` into `ui`. Translate every visible or
accessible value: metadata, index, all five articles, source roles, experiment
CTAs, dates shown to readers, boundary text, navigation and timing-model copy.
No English fallback exists. Sections, facts, paragraphs and reference arrays
must retain the source shape and order; this deliberately fails closed when the
editorial source adds or removes material. Bibliographic titles may stay in
their original language so readers can identify the cited work.

Keep source IDs, `sourceIds`, research URLs, experiment routes and experiment
hrefs exactly as in English, including `?scope=signal`. Internal URLs stay in
the source format `/en/...`; the renderer changes their locale without altering
protocols or query parameters. Escape-free plain text is sufficient; the
renderer escapes all authored content as HTML. Do not insert markup.

Use real ISO dates, no later than today. All article `dateModified` values must
match `reviewedDate`; `publishedDate` must be no later than that date. Localized
`updated` values are the reader-facing rendering of the same review date.
The index uses `reviewedDate` for both schema and sitemap freshness. These are
content dates, not build timestamps. A locale's publication adds six sitemap
URLs. Its dates also feed the existing content fingerprint gate.

## Review and activate

1. Finalize the English editorial source and template before reviewing a
   translation. Obtain the current hash with
   `npm run learn:check -- --source-hash`. The hash covers English content and UI;
   every source change requires reviewing the complete translation again.
2. Translate and review the full catalog. Set the four review attestations only
   after checking scientific limits, privacy, source roles, all cited URLs and
   unchanged experiment protocols. Record the responsible reviewer. This is a
   content review record, **not** a claim of professional, native or clinical
   validation. No cited paper validates the assembled Sense6 implementation.
3. Run `npm run learn:check -- /tmp/sense6-fr.json fr` while still a draft.
4. Copy the reviewed catalog to `src/learn-locales/fr.json` and add
   `"fr": { "label": "Comprendre", "publishedAt": "2026-10-11" }` to `published.json`. Use the catalog's exact
   `ui.Learn` translation as the label. Add `publishedAt` as the ISO
   first-release date for that language. Keep it unchanged on later revisions;
   structured-data `datePublished` uses this, while `dateModified` follows
   the updated review date. Both changes must ship together. Never
   add a manifest entry without its complete catalog.
5. Run `npm run check:core`, `npm run docs:check`, focused Learn browser checks,
   and the existing release gates before publication. Update baseline tests
   that explicitly pin the English-only public set when the first real locale
   is activated. Inspect all six pages with and without JavaScript, Arabic RTL
   when applicable, locale switching, source jumps and related experiment links.

Generation, runtime routing, header navigation, reciprocal hreflang and
`llms.txt` share the manifest. Switching to an unpublished language leads to its
existing gallery. An unavailable catalog throws rather than silently rendering
English. Hreflang is absent in the English-only baseline and includes only
published locales once a second complete translation exists. Runtime navigation
updates canonical, social metadata and Learn JSON-LD together and removes stale
Article claims when leaving Learn. Guide links already present in English
experiment/result views remain unchanged; adding translated experiment result
copy is outside this architecture change.

## What validation proves

`npm run learn:check` runs before every build and inside `check:core`. It rejects
missing or extra fields/routes, missing catalogs, public drafts, stale hashes,
missing reviews, changed source identities, unknown references, copied English
(including English with a translated prefix), thin paragraphs, obvious
placeholders, unsupported translation-review claims and invalid/future dates.
It cannot prove language fluency or scientific equivalence. Responsible human
review remains necessary; passing software checks is not an editorial endorsement.

[learn-publication.test.js](../../tests/learn-publication.test.js) creates a
synthetic French software fixture in an isolated temporary source tree. It
exercises validation, real locale loading, shared rendering, all six generated
pages, citations, review dates and reciprocal SEO without changing the real
manifest or leaving fake translations on public paths. The fixture is not a
translation suitable for publication. No translation service or API key is used.

To withdraw a locale, remove its manifest entry and catalog together, rebuild
from clean output and verify that discovery contains no withdrawn pages. Plan
any production redirects separately; a missing guide must not become an
indexable English page at a translated URL.
