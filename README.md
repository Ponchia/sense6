<!-- vale off -->
# Sense6
<!-- vale on -->
<!-- vale Vale.Spelling = NO -->

A small collection of experimental browser-based perception tests, made for
curiosity and fun. Every gallery, exam, About, journal, and privacy route has a
substantive localized HTML entry page for people, search engines, and
text-retrieval tools. JavaScript then mounts the selected experiment as a
progressively enhanced module; results and answers remain local. The service
stores only anonymous daily activity totals. Sense6 is not validated,
certified, diagnostic, or intended to become a medical product.

The localized [About page](https://sense6.net/en/about/) explains how the tasks
work, who maintains them, their privacy boundary, and what each result can and
cannot describe.

The English [Learn section](https://sense6.net/en/learn/) answers research
questions beyond the experiments: [tetrachromacy and what an RGB screen can
establish](https://sense6.net/en/tetrachromacy-guide/), and [reaction-time
measurement in browsers](https://sense6.net/en/reaction-time-guide/).
Both have cited sources, an author/review date and a link to a related
experiment. No translated versions are published until review, so these guides
do not advertise invented multilingual alternatives. Research informs their
content but does not validate the Sense6 implementations.

Live exams:

- **Tetracromia / Screen Colour Lab** — three fixed-dose colour observations:
  tile choices, dot-field choices, and hue ordering. It reports no composite
  score or stable threshold.
- **Daltonia** — three exploratory, display-relative adaptive colour-direction
  levels with luminance-noise targets and task controls. It reports no
  colour-vision classification or cone threshold.
- **Riflessi** — selectable simple-response, two-choice, and sustained-response
  tasks. It keeps timing, accuracy, slow-tail, and within-run drift observations
  separate.
- **Udito** — selectable device-relative listening tasks for presentation
  confidence, an upper run boundary, and pitch steps near 500 Hz and 2 kHz. It
  reports no dB HL, hearing age, diagnosis, or composite score.
- **Acutezza** — selectable per-eye calibrated sharpness and nominal
  low-contrast conditions. It reports angular-gap estimates with 90% model
  intervals, never 20/20, a diagnosis, astigmatism, or a prescription.

The gallery offers a short Riflessi starter at
`/{locale}/riflessi/?scope=signal`. This link preselects the existing
approximately two-minute Segnale scope and opens its normal setup; it never
starts a timed run or bypasses device/input choice or explicit consent.
The canonical experiment route and other scopes remain available.

Read the [architecture overview](docs/architecture.md) before changing a
cross-cutting boundary. To add an experiment, follow the
[experiment extension guide](docs/adding-an-experiment.md). It covers the
service contract, presentation registry, domain model, mount lifecycle,
journal passport, localization, route stylesheet, static content, and required
tests. The [documentation index](docs/README.md) distinguishes maintained
guides from decisions, archived research snapshots, and operational runbooks.

Acutezza's source-backed [research and implementation
brief](docs/research/acutezza.md) records the method, product boundary, completed
software checks, and the permanent distinction between implementation
verification and scientific validity.

The cross-test [evidence and product
audit](docs/research/five-test-evidence-and-product-audit.md) reviews the shipped
protocol, duration, references, competitors, interface, result completeness,
open-source precedents, and recommended next work for all five experiments.

The [product and engineering roadmap](docs/roadmap.md) records the completed
private repeated-run journal and the permanent experimental product boundary.
The shared lifecycle, versioned persistence, route-level loading, and bundle
budgets are established foundations.

## Background

Each experiment freezes its method identity, scope, schedule summary, stopping
rule, and interpretation boundary in `src/exams/protocols.js`. A completed
journal entry stores that passport. The journal doesn't compare entries from
different scopes, changed methods, or legacy protocols.

`src/exams/sources.js` is the canonical evidence ledger. Every source has one
role: method source, interpretation boundary, related instrument, or Sense6
validation. The interactive research trails, localized static pages, and
`llms.txt` are generated from this ledger. The validation role is intentionally
empty because no publication has evaluated an exact, frozen Sense6 protocol.

The five-test [evidence and product
audit](docs/research/five-test-evidence-and-product-audit.md) records the full
protocol, source review, competitor analysis, interface findings, and remaining
evidence gaps. It distinguishes software verification from construct validity,
external validation, and population norms.

The production scopes are:

- **Screen Colour Lab:** one fixed 29-block exploratory protocol. Its two
  adaptive tasks report ending levels and performance counts; the ordering task
  reports ordered adjacent pairs. It computes no overall score, best result,
  radar, stable threshold, or tetrachromacy inference.
- **Daltonia:** one short exploratory protocol with two feedback practices, 36
  scheduled direction presentations, and three task controls. Responses stay
  locked until the stimulus has painted. Invalid and duplicate responses can't
  advance the track. Target and field dots use matched linear-sRGB luminance.
- **Riflessi:** Segnale, Segnale + Scelta, or the complete three-instrument set.
  Results retain scheduled and valid denominators, choice accuracy, event
  counts, timing health, interruptions, input mode, and physical setup.
- **Udito:** Focused includes Cuffie and Portata; Standard adds the two
  Intonazione tracks. A maximum-level reference, three audibility anchors,
  guaranteed Portata controls, recent ceiling evidence, and a final unchanged-
  volume confirmation gate every result.
- **Acutezza:** Focused measures high-contrast angular detail; Standard adds a
  nominal low-contrast condition. Controls run per eye and condition. Results
  retain calibration provenance, physical scale, actual contrast, second-eye
  distance recheck, bounds, and 90% model intervals. The invalid Meridiani
  implementation and scorer are removed pending a separately designed and
  simulated protocol.

Choosing a smaller scope omits unrun instruments instead of displaying
placeholders. “Repeat this scope independently” starts the same frozen method
again and preserves both entries for an honest same-protocol comparison. Sense6
never pools repeats silently or keeps only a best run.

## Install

You need Node.js 22 or later.

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
```

## Usage

Start the local development server:

```sh
npm run dev
```

Open the URL printed by Vite. Complete the screen check before you start the
colour tests, choose one input path before starting Riflessi, or complete
Udito's low-volume reference and volume-lock contract. Each completed run adds
a structured entry to the private journal in local browser storage. Sense6 does
not send session answers, measurements, journal entries, or results to a
server. It sends one allowlisted event name and test name when a page loads or a
measured run starts or completes.

## Private measurement journal

Open `/{locale}/journal/`, for example `/en/journal/`, to review up to 100 saved
runs. Each entry contains structured measurements, uncertainty or measurement
bounds when an instrument provides them, and a setup passport with the
conditions needed for comparison. Comparisons are instrument-specific and use
three labels: comparable, comparable with caution, or not comparable. Sense6
does not convert the five instruments into a suite-wide score.

You can delete one entry, delete the complete journal, export a documented JSON
file, or merge that file back into a browser. Imports are size-limited,
validated, schema-versioned, and idempotent by entry ID. The journal remains on
the device unless you deliberately save or move an exported file. The compact
legacy latest-or-best result keys remain readable for compatibility.

## Privacy-preserving metrics

Sense6 doesn't use analytics cookies, browser storage, identifiers,
fingerprints, IP addresses, user-agent strings, referrers, answers, scores, or
exact event timestamps for product metrics. A Cloudflare Pages Function accepts
only an allowlisted event and test name. The server chooses the coordinated
universal time day and atomically increments one row in D1. The resulting table
contains only `day`, `test`, `metric`, and `count`.

`site_loaded` measures document loads, not unique people. Reloads and bots can
increase the count. `test_viewed` records a successfully mounted experiment
landing route, including repeated navigation. It makes aggregate
landing-to-measured-start conversion visible without joining events into a
visit. `test_started` begins at the first measured block after any practice.
Sense6 records `test_completed` only when the result view appears. Sense6
reserves `report_downloaded` for a future report action.

The write endpoint has no read, update, or delete operation. It requires a JSON
request whose request URL and `Origin` are both exactly `https://sense6.net`,
rejects unknown fields and event combinations, limits the body to 128 bytes,
and fails closed when D1 is unavailable. Production builds also disable metric
sends away from that canonical origin. Analytics availability can't block a
test.

The interface uses [`@ponchia/ui`](https://github.com/Ponchia/bronto-ui) for its
tokens, typography, layout primitives, controls, feedback, theme behavior, and
site shell. Product-specific stimulus geometry remains local to this project.

## Localization

Sense6 supports English, Italian, German, French, Spanish, European Portuguese,
Brazilian Portuguese, Arabic, Japanese, Korean, Hindi, and Simplified Chinese.
Locale-aware paths make every exam directly addressable, for example
`/it/udito/`, `/pt-br/acutezza/`, or `/zh-hans/riflessi/`. Historic hash links
such as `#/it/udito` and `#/udito` remain valid and are replaced with the
corresponding canonical path in the browser. Regional language-tag paths such
as `/pt-BR/` and `/zh-CN/` redirect to their canonical locale routes.

On a first visit, Sense6 selects the first supported language reported by the
browser and otherwise falls back to English. A choice made in the header is
stored under `sense6:locale` in local storage. Changing the language keeps the
current exam open. The runtime also updates the document language, page title,
metadata, internal links, accessibility labels, number formatting, and copied
result summaries. Arabic sets right-to-left document flow. Spatial experiment
controls retain physical left/right placement and numbered keyboard order in
every writing direction.

English source phrases and their eleven translations live in
`src/locales/<language>.js`. Coordinated registry, landing, and mobile copy is
authored in shared source modules and generated into
`src/locales/generated/*.json`; run `npm run locales:generate` after changing
those rows. Only the active language catalog is loaded at runtime.
Reusable controls and safety boundaries use stable IDs from
`src/i18n/message-ids.js`; call `m(id)` for that copy. Existing experiment
prose remains source-keyed and migrates when it is changed. Add every new source
phrase with the same placeholders in every language and translate dynamic text
explicitly where it is rendered. Route-specific privacy and journal copy for
the added locales lives in `src/locales/supplemental/`.
`tests/i18n.test.js` rejects missing stable IDs, missing values, duplicate
English source phrases, placeholder drift, and accidental safety-copy fallback.
Browser tests cover locale routing, regional detection, right-to-left behavior,
persistence, accessibility, and mobile overflow.

Run `npm run locales:check` for a compact completion report across all catalogs,
or `npm run locales:check -- --details` to list every source-equal string. The
same audit runs inside the release gate and also catches missing or duplicate
keys, empty values, missing stable IDs, and placeholder drift.

## Static discovery and crawler policy

`npm run build` creates 109 localized static entry pages: the root, all twelve
galleries, all 60 exam routes, all twelve About routes, all twelve journal
routes, and all twelve privacy routes. Each route contains useful content
without JavaScript, a unique title and description, a canonical URL, reciprocal
`hreflang` links, truthful structured data, research links, and real internal
links. Journal and privacy remain reachable user tools but carry `noindex` and
stay out of the sitemap; the 85 root, gallery, experiment, and About pages form
the search-indexable set. English experiment pages add original query-led
explainers without silently copying unreviewed English prose into other locales.
The build also creates an exact sitemap, `robots.txt`, an optional `llms.txt` discovery
summary, and a script-free `404.html` so unknown paths don't become indexable
soft-404 responses.

The default policy allows conventional search and user-directed retrieval
crawlers. It disallows `GPTBot` and `ClaudeBot`, which are associated with model
training rather than a user's immediate request. Review that deliberate product
choice whenever the crawler policy changes; `llms.txt` is a convenience, not an
access-control mechanism. `src/crawler-policy.js` records the provider purpose,
official guidance, review date, and next review deadline. Static verification
fails after that deadline until the policy is reviewed. Preview deployments
send `X-Robots-Tag: noindex`.

Static pages are generated from `src/exams/registry.js`, the locale catalogs,
the structured About copy, and the privacy copy. Don't hand-edit files under
`dist/`.

## Develop and test

Run the deterministic colour, timing, adaptive hearing, calibrated acuity, and
session-engine tests:

```sh
npm test
```

Check the JavaScript and CSS source with Biome:

```sh
npm run lint
```

Check the strict typed-JavaScript contracts and coverage ratchet:

```sh
npm run typecheck
```

The ratchet automatically includes domain models, experiment views,
localization helpers, and locale catalogs; it also rejects unchecked additions
and type-suppression escapes in those boundaries. Unchecked indexed access is a
compiler error, so fixed-size data uses tuples and variable lookups declare
their fallback or failure behavior. Experiment controllers expose checked
public declarations and are converted internally one stable transition at a
time. See ADR 0005 for the evidence that would justify moving individual
modules to TypeScript.

Run unit tests with enforced coverage for shared storage and lifecycle code:

```sh
npm run test:coverage
```

Coverage says a line ran; it does not say anything asserted its result. Check
that the shared `src/lib` modules are actually pinned by mutating one operator
or literal at a time and re-running the unit suite:

```sh
node scripts/mutation-check.mjs                     # every src/lib module
node scripts/mutation-check.mjs src/lib/hearing.js  # one module
node scripts/mutation-check.mjs --list src/lib/hearing.js
```

A mutant reported as `KILLED` is a line the suite genuinely checks. A `SURVIVED`
mutant is a line the suite executes without asserting anything about it, and it
is either a missing assertion or an equivalent mutant whose change cannot alter
observable behaviour. That distinction needs per-mutant evidence: read the
reported line, decide which it is, and add a test if it is the first. `TIMEOUT`
means the mutant made the suite hang, which usually means the mutated line was a
loop's only exit — real, but better replaced by a test that fails fast.

The harness edits files in place and restores them afterwards, so it refuses to
run against a target with uncommitted changes; `git checkout -- <file>` is always
a valid recovery. It is a reporting tool and never sets a failing exit code, and
it is deliberately not part of `check:core` because a full sweep re-runs the
suite once per mutant.

Build the production bundle:

```sh
npm run build
```

Verify the generated routes, metadata, crawler files, security policy, and
bundle budgets:

```sh
npm run test:static
```

Run the browser, accessibility, and responsive checks:

```sh
npm run test:e2e
```

The full suite runs in desktop and mobile Chromium; the artifact hydration,
full Screen Colour Lab run, and display-invalidation checks also run in
Firefox and WebKit.

For a quicker representative browser pass, including all five instruments,
route navigation, journal import, and the built-artifact handover, run:

```sh
npm run test:pr-smoke
```

The named `@pr-smoke` journeys are the browser gate for same-repository pull
requests. The **complete** multi-browser suite still gates every production
deployment from `main`; the fast pass does not authorize a publication.

Run every gate:

```sh
npm run check
```

The release-only artifact checks add generated HTML validation, internal-link
validation, and the production site audit:

```sh
npm run check:release
```

`check:core` covers lint, the typed-JavaScript and locale ratchets, Bronto UI
contracts, coverage, the production build, static output, security policy, and
bundle budgets. `check` adds the browser matrix. `check:release` adds checks
against the exact generated site. Every pull request and push also runs the
container visual comparison and indexable representative-route Lighthouse budgets
in the same dependency graph as release, so either can stop publication. The complete
85-page indexable-route Lighthouse sweep, external-link crawl, and passive ZAP scan
remain scheduled or operator-run audits. The external-link job uses bounded
retries and per-host concurrency for transient publisher failures. The passive
scan fails on unreviewed ZAP alerts and records accepted static-site findings in
`.zap-rules.tsv`; it prints the result directly instead of depending on
account-wide artifact storage.

## Deploy

Every push to `main` runs the complete lint, locale, unit, build, browser,
visual, responsive, accessibility, static-output, and bundle-budget gate. The
release job builds `dist/` once, stamps `build-meta.json` with the workflow
commit, writes a file-by-file SHA-256 manifest, verifies it, and runs the
production site audit. After the browser, visual, and Lighthouse gates pass,
that release job deploys the checked working tree without rebuilding production
output or depending on external artifact storage.

Same-repository pull requests run representative browser journeys, all
non-browser release checks, visual regression, and Lighthouse budgets without
deployment credentials or preview publication. A push to `main` runs the
complete browser matrix as an additional hard prerequisite.
All jobs use the `arc-vps-sense6` ARC scale set in the netcup cluster,
managed by `vps-infra/cluster/gha-runner/`, rather than GitHub-hosted
runners. External fork pull requests are denied access to that scale set.

Both the client and Pages Function accept metrics only on
`https://sense6.net`; Pages project URLs remain non-production origins. The
protected preview prerequisite and activation constraints appear below and in
the release runbook.

The initial English route has a generous 150 kB raw-JavaScript guardrail
across the transitive Vite entry and locale graph. Entry CSS may be up to
160 kB raw, an individual route stylesheet up to 60 kB, and the entry plus
largest route stylesheet up to 200 kB. Experiments and Learn remain route-split;
unused editorial code must not enter the initial payload.

These are broad build-size safety limits, not micro-optimization targets.
Lighthouse still enforces strict LCP, TBT and CLS thresholds on rendered pages.
A small feature-driven bundle increase should not require architecture churn
when measured user-facing performance remains within those gates.

The production site is available at
[`sense6.net`](https://sense6.net). Cloudflare Pages terminates TLS and serves
the files from its edge; the site has no application server or origin in the
personal Kubernetes cluster. The old
[`tetracromia.brontolotto.observer`](https://tetracromia.brontolotto.observer)
hostname and `www.sense6.net` redirect to the canonical domain through
Cloudflare Single Redirect rules. Pages `_redirects` files cannot match source
hostnames, so keep domain-level redirects in the corresponding Cloudflare zone.

Pull requests run verification with read-only repository access and without
deployment credentials. Pull-request preview publication is disabled. To
activate it, first create and verify an isolated, protected preview environment,
then add a default-branch-owned workflow that publishes only the verified
artifact without running pull-request-controlled code. This repository change
doesn't verify or create that external configuration.

The production workflow uses the existing Cloudflare account credentials and
can publish only from `main`. Scope its token to Cloudflare Pages edits for the
account that owns `sense6.net`.

The Pages project also requires a D1 binding named `ANALYTICS_DB`. Apply
the complete ordered migration set in `migrations/` to that database before
enabling the binding or merging code that adds a metric pair. Migration tests
execute the full set in SQLite and prove that every runtime-allowed pair fits
the production constraints. Keep metric reads private in the Cloudflare
dashboard or Wrangler; don't add a public read endpoint.

Add the zone's single rate-limiting rule for production before enabling the
counter. Match `POST` requests whose path equals `/api/metric`, allow 10 requests
per 10 seconds per source IP, and block excess requests for 10 seconds. This is
the free-plan minimum window and leaves ample room for a page load, experiment
view, test start, completion, and report download. Cloudflare uses the request
IP transiently for this edge control; Sense6 doesn't copy or store it.

Use the [Cloudflare Pages release runbook](docs/runbooks/cloudflare-pages-release.md)
for migration, binding, production verification, rollback, and the protected
preview activation prerequisite.

## Scientific limits

Browser color output depends on the panel, color profile, browser, brightness,
ambient light, viewing angle, and color-altering operating-system features.
Tetracromia therefore keeps the stimulus surround neutral, detects the gamut
reported by the browser, and reports three short-run, display-relative
observations rather than stable thresholds or an ability score. Daltonia's
adaptive levels remain coordinates from one browser display, not cone
measurements or a colour-vision classification.

Browser response timing depends on the display refresh path, input hardware,
operating system, browser, and current device load. Riflessi exposes timing
health and input mode but cannot calibrate those delays. It does not assess
fatigue, concussion, driving fitness, neurological health, or any other medical
or occupational condition.

Browser audio depends on device volume, digital processing, sample rate,
headphone frequency response and fit, assistive devices, room noise, and the
listener. Udito has no acoustic coupler, calibrated transducer, microphone, or
sound-level measurement. Its upper boundary and pitch steps therefore describe
only one run under one setup. They cannot establish clinical hearing thresholds,
hearing loss, hearing age, safe listening ability, or fitness for medical or
occupational use.

Browser acuity depends on physical scale, viewing distance, display resolution,
contrast rendering, correction, lighting, and the person's setup. Acutezza
records those conditions and reports model-based angular-gap estimates for one
run. Its model interval isn't a clinical confidence interval, and its nominal
low-contrast difference isn't contrast sensitivity. It doesn't establish
20/20 vision, refractive error, astigmatism, or a prescription.

Do not use this site for medical or occupational decisions. Use a validated
clinical or physical test administered under controlled conditions when the
result matters.

## Maintainer

Zeno

## License

[MIT](LICENSE)
