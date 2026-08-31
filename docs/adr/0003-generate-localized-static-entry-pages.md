# 0003. Generate localized static entry pages
<!-- vale Vale.Spelling = NO -->

Status: Accepted

Lifecycle: current

## Context

Sense6 was a client-rendered single-page application with hash routes. A person
without JavaScript, a search crawler, or a text-retrieval agent received the
same nearly empty shell for every gallery, experiment, and privacy view. Route
content, research links, metadata, and language relationships existed only
after JavaScript ran.

Moving the complete application to a server-rendered framework would add a
runtime and migration cost that the small static suite doesn't otherwise need.
Maintaining separate handwritten HTML pages would duplicate product and locale
content and allow the static and interactive views to drift.

## Decision

- Keep Vite and the client-side experiment architecture.
- Treat `src/exams/registry.js`, the locale catalogs, and privacy copy as the
  source for both runtime rendering and static discovery content.
- After Vite builds, generate one HTML entry page for every localized gallery,
  experiment, and privacy route, plus a language chooser at the root.
- Put substantive headings, summaries, limits, methods, research links, and
  real navigation links in the initial HTML. JavaScript progressively enhances
  the selected route with the interactive experiment.
- Give every page a unique title and description, self-canonical URL,
  reciprocal `hreflang` links, and structured data that describes only what the
  page actually provides. Keep journal and privacy available as localized user
  tools while marking them `noindex`.
- Generate an exact sitemap from the indexable root, gallery, experiment, and
  About routes, plus a documented crawler policy, an optional `llms.txt`
  discovery summary, and a script-free 404 page.
- Preserve historic hash links by replacing them with their canonical paths in
  the browser. Don't list legacy URLs in discovery artifacts.
- Verify route content, metadata, internal links, security headers, discovery
  files, and bundle budgets in CI.

## Consequences

- Search and text-retrieval clients can discover and read useful localized
  content without executing JavaScript.
- A browser downloads only the active locale and experiment module, but the
  static generator still validates the complete content set at build time.
- Static and interactive views share product facts, although prose that exists
  only inside an experiment still needs an explicit catalog entry when added.
- The generated route matrix increases the file count in `dist/`; those files
  are build output and mustn't be edited by hand.
- `robots.txt` is an advisory crawler policy, while `llms.txt` is only a
  discovery convention. Neither replaces access control or guarantees use by a
  model provider.
