# Sense6 architecture
<!-- vale Vale.Spelling = NO -->

Lifecycle: current

This document describes the app boundaries you need when changing or
extending Sense6. Read the decision records in `docs/adr/` for the reasons
behind individual choices.

## Goals and constraints

Sense6 provides short, device-relative perception experiments without accounts
or result uploads. The design favors:

- explicit experimental and non-diagnostic boundaries;
- deterministic measurement models with browser journeys around them;
- local, validated, versioned result storage;
- useful static HTML for every localized route;
- route-level loading and enforceable bundle ceilings; and
- a small runtime with no app framework.

Consumer devices remain uncalibrated. Architecture can preserve setup evidence
and measurement bounds, but it can't turn a browser task into a clinical
instrument.

## System context

<!-- markdownlint-disable MD013 -->

| Participant | Interaction | Data boundary |
| --- | --- | --- |
| Person using Sense6 | Opens a localized route, completes an experiment, and optionally exports a journal | Answers, measurements, and journal entries stay in that browser |
| Cloudflare Pages | Serves immutable static assets and generated HTML | Processes ordinary delivery traffic outside the Sense6 app |
| Metrics Function and D1 | Accepts one allowlisted event and experiment name | Stores only coordinated-universal-time day, experiment, event, and count |
| Maintainer | Changes source, reviews research, and deploys a verified build | Has no product endpoint for reading a person's results |

<!-- markdownlint-enable MD013 -->

## Building blocks

<!-- markdownlint-disable MD013 -->

| Boundary | Source | Responsibility |
| --- | --- | --- |
| Shell and router | `src/main.js`, `src/router.js`, `src/routes.js` | Resolve locale-aware routes, commit canonical, social, and robots metadata with one view, and dispose the previous view |
| Service contracts | `src/exams/contracts.js` | Define experiment identity, metric names, and journal-comparison policy |
| Presentation metadata | `src/exams/registry.js`, `src/exams/metadata.js` | Define concise gallery copy, experiment-only discovery descriptions with locale-safe fallback, and lazy experiment loaders |
| Protocol passports | `src/exams/protocols.js` | Freeze method versions, selectable profiles, schedule digests, stopping rules, and interpretation boundaries |
| Evidence ledger | `src/exams/sources.js` | Classify canonical sources as method, boundary, comparator, or exact Sense6 validation evidence |
| Experiment controllers | `src/exams/*.js`, `src/exams/*.d.ts` | Coordinate setup, response handling, phase changes, and results for one experiment; declarations define their checked public mount boundary |
| Result schemas | `src/exams/results/*.js` | Validate and migrate experiment-specific latest-result payloads without coupling service contracts to route code |
| Experiment views | `src/exams/views/*.js` | Produce pure markup for large landing, result, or phase views without owning runtime state |
| Domain models | `src/lib/*.js` | Implement strictly checked adaptive tracks, schedules, summaries, persistence, lifecycle behavior, and guarded state transitions |
| Shared landing views | `src/exams/landing.js` | Render repeated instrument, method, and research structures |
| Localization | `src/i18n.js`, `src/i18n/message-ids.js`, `src/i18n/catalog-audit.js`, `src/locales/` | Generate coordinated locale rows, load one catalog, translate stable shared IDs and source-keyed prose, apply locale metadata, and report catalog drift |
| Static generator | `scripts/generate-static-pages.mjs`, `scripts/static-structured-data.mjs` | Produce localized discovery HTML, structured metadata, sitemap, crawler files, and the 404 page |
| Local journal | `src/lib/journal.js`, `src/journal.js` | Validate, store, compare, import, export, and render structured runs |
| Anonymous metrics | `src/metrics.js`, `functions/api/metric.js` | Allowlist client events and increment daily aggregate counts |

<!-- markdownlint-enable MD013 -->

## Runtime flow

1. The static HTML identifies the canonical route and provides useful content
   before JavaScript runs.
2. `main.js` initializes one locale catalog and starts the router.
3. The router disposes the current mount before loading the next route module.
4. An experiment's `mount(context)` creates a lifecycle owner, installs
   abortable handlers, renders its current phase, and returns a cleanup
   function.
5. Pure domain modules generate trials and summarize answers. The controller
   presents those values but doesn't duplicate the numerical model.
6. A completed run writes its protocol passport, setup passport, quality
   evidence, and separate measurements to a validated local journal entry.
7. On the canonical production origin only, a mounted experiment landing,
   measured start, and completion each send one allowlisted aggregate counter
   with no result, setup, locale, session, or visitor data.

Render tokens prevent a slower dynamic import from overwriting a newer route.
Gallery, Tetracromia, the other experiments, About, privacy, and journal styles
load on their own route where practical.

Asynchronous audio and sharing operations also capture the owning mount and
run or operation. Navigation, changed audio setup, and restarting a completed
run retire that ownership before a pending browser promise can publish feedback.
Checking only that the route is still mounted is insufficient: a new run may
reuse the same mount.

## Route identity and loading

`src/routes.js` creates one route metadata record for the static generator and
the runtime router. A successful navigation commits the title, description,
canonical URL, Open Graph fields, Twitter fields, and indexability with the
mounted view. Journal and privacy are useful application routes but not search
landing pages, so they carry `noindex` and are absent from the sitemap; navigating
back to a gallery, experiment, or About page removes that robots directive. The
generated 404 removes canonical and social identity because it does not
represent a real route.

The static generator reads the Vite manifest and preloads the active route's
transitive JavaScript modules. It does not add an active-route preload to the
language chooser because that page has no selected locale route. Privacy and
journal load one supplemental locale module only when the requested locale
uses that separate copy bundle. Run `npm run build && npm run test:static` to
verify the generated metadata, 404 boundary, and preload graph.

## Data and privacy

The current design has three deliberately separate stores:

- concise versioned latest-result records in browser storage;
- the versioned, validated multi-run journal in browser storage; and
- anonymous daily aggregate counts in D1.

Latest-result readers validate the owning experiment's payload before showing
previous-run context. Udito, Riflessi, Acutezza, and Daltonia keep their guards
under `src/exams/results/`. Tetracromia writes to the validated shared journal
without a separate latest-result record.
Legacy acceptance follows actual historical producers. A migration must not
invent a missing denominator, measured eye, or protocol identity, and a newer
schema must not silently reinterpret an incompatible older measurement.

Don't merge these models. The metrics endpoint must never accept result,
setup, locale, timing, or visitor data. Journal exports become portable files
only when the person explicitly saves them. Clearing browser storage can
remove the journal; it is not a remote backup.

`src/metrics.js` owns allowed event/experiment pairs. The Pages Function accepts
only those two fields in a JSON body of at most 128 bytes, requires the
canonical production request origin and `Origin` header, and chooses the UTC
day on the server. It stores only `day`, `test`, `metric`, and `count`; there is
no public read operation. The client omits credentials and referrers, and a
failed metric request cannot block the experiment. Hosting and edge protection
still process ordinary web requests outside this application store.

Document loads, mounted experiment landings, first measured starts, and result
views are separate activity counts. Repeated navigation, reloads, and bots can
affect totals. They cannot identify unique visitors, establish a session
funnel, or demonstrate task validity. `report_downloaded` is reserved for a
future report action.

Journal imports first validate and canonicalize the file, then show additions,
duplicates, discarded additions, existing-entry evictions, and the resulting
total. The journal writes only after explicit confirmation of that preview.
Displayed model intervals remain descriptive output. A journal entry records a
value, a unit, an optional model interval, and an optional measurement bound —
never a combinable uncertainty. No Sense6 instrument can produce one: the
Acutezza posterior interval deliberately excludes the geometry systematics that
a screen-relative setup contributes, so presenting it as uncertainty would
publish a falsely narrow number. A run-to-run change therefore reports the
difference and whether either value is a bound, and nothing more.

## Extension seams

Add cross-cutting policy to a shared boundary only when at least two consumers
need it. Current examples are experiment contracts, protocol passports, the
evidence ledger, lifecycle cleanup, persistence envelopes, stable message IDs,
and landing-section renderers.

Keep stimulus generation, task schedules, quality decisions, interpretation,
and result wording inside the owning experiment and its domain module. Shared
quality evidence is an envelope and vocabulary, not one cross-test scoring
formula. A generic experiment engine would hide meaningful differences among
color, timing, audio, and acuity tasks.

Follow [adding an experiment](adding-an-experiment.md) for the complete
extension contract.
Tests compare the service-contract IDs with the presentation registry, so a
partially registered experiment fails early.

## Quality gates

`npm run check:core` verifies source, typed JavaScript, locale catalogs,
documentation, UI contracts, shared-module coverage, the production build, and
static output. `npm run check` adds the complete configured browser matrix.
`npm run check:release` also validates generated HTML, internal links, and site
behavior. The [contributor guide](../CONTRIBUTING.md) lists setup and focused
commands.

The `chromium` and `mobile` projects run the complete behavioral suite against
the Vite dev server. Accelerated fixtures require development mode and
localhost; production schedules have separate unit-test invariants. The
`chromium-smoke`, `firefox`, and `webkit` projects run selected journeys against
generated `dist/` with production response headers. Those artifact checks cover
hydration, a full Screen Colour Lab run, and display invalidation. This is
selected compatibility coverage, not every experiment journey in every engine.

The type gate automatically includes every module under `src/lib/`,
`src/exams/results/`, `src/exams/views/`, `src/i18n/`, and `src/locales/`, plus
named shared runtime boundaries and controller declarations. The ratchet fails
if the configuration omits a strict file. It also rejects type-suppression
comments and explicit JSDoc `any`. `noUncheckedIndexedAccess` requires fixed
tuples or explicit handling for array, record, regular-expression, and other
indexed lookups.
Values crossing browser and storage boundaries still require runtime
validation.

CI runs the named representative browser suite for same-repository pull
requests, covering the five instruments, routing, journal, and artifact
handover. A push to `main` runs the complete configured browser
matrix before the release job creates its artifact. Visual comparison, Lighthouse
budgets, and the non-browser release checks remain hard gates in both cases.
The release job creates `dist/`, stamps the commit in `build-meta.json`,
writes and verifies a SHA-256 manifest, and audits the built site.
Only a main-branch release publishes that verified working tree without
rebuilding it. This keeps artifact identity exact without depending on
account-wide artifact storage.

After a trusted production publication, one Chromium journey loads the deployed
JavaScript, enters a real experiment setup, blocks metric POST requests, checks
browser and content security policy failures, and verifies the generated 404
response. CI treats a retry-only success as a failure and retains the trace,
screenshot, video, and HTML report. Pull-request workflows do not run this
production-origin check.

The scheduled external-link audit retries transient publisher failures with
bounded per-host concurrency. The passive security audit treats unreviewed ZAP
alerts as failures and keeps reviewed static-site exceptions in
`.zap-rules.tsv`. It runs the pinned ZAP container directly, so a security
result does not depend on account-wide artifact storage.

Raw bundle safety ceilings are intentionally generous:

- initial JavaScript: 150 kB;
- entry CSS: 160 kB;
- each route stylesheet: 60 kB; and
- entry CSS plus the largest route stylesheet: 200 kB.

These guard against runaway growth rather than forcing refactors for small
changes. Lighthouse still strictly enforces LCP/TBT/CLS on rendered pages.
The static-output test traverses the Vite manifest for the initial locale
graph, verifies lazy route splitting, discovers stylesheets automatically,
and checks Cloudflare headers and function-routing contracts.

## Known pressure points

Experiment controllers still contain substantial unchecked phase-specific
event orchestration. The type gate checks their public `mount(context)`
contract, the cognitive-complexity gate rejects functions above 28, and the
maintainability test prevents known large controllers and style sheets from
growing beyond their decomposition ceilings. Acutezza's intro and result view,
Udito's intro and result view, Riflessi's result view, the strict result-schema
boundary, and Tetracromia's extracted views and event handlers establish the
incremental pattern: don't add a suite-wide base controller.

The Udito and Riflessi result views receive read-only result data, a small
projection of presentation context, and explicit localization callbacks.
They own markup and copied-summary formatting; controllers retain measurement
decisions, persistence outcomes, DOM assignment, focus, and lifecycle ownership.
When you change one phase, extract its pure markup, result schema, or state
transition behind a small typed interface and keep measurement behavior
covered. The ordered controller backlog lives in `roadmap.md`.

Legacy localization uses English source prose as catalog keys. Stable IDs now
cover reusable controls and safety boundaries. `npm run locales:check` reports
catalog progress, missing or duplicate keys, missing stable IDs, source-equal
strings, and placeholder drift. Migrate older prose when it changes. A
wholesale key conversion would create translation risk without a user-visible
benefit.

`src/locales/registry-copy.js` keeps coordinated experiment, result, scope, and
evidence-role changes atomic across all catalogs. This is a migration seam, not
a second presentation registry: keys still originate in product code, and the
catalog audit rejects duplicates or placeholder drift.

Shared shell, method, setup, and result primitives remain in the entry style
sheet because several experiments use them. Tetracromia-owned landing visuals
live in `src/styles/tetracromia-landing.css`; its lab and result layouts live in
`src/styles/tetracromia.css`. Riflessi follows the same landing/core split.
Keep those route ownership boundaries when expanding either experiment.

## Delivery environments

Same-repository pull requests run representative browser checks plus the
complete non-browser, visual, Lighthouse and artifact verification gate, with
read-only repository access. The complete browser matrix gates production
`main` only. The current workflows use the `arc-vps-sense6` self-hosted
runner. Their same-repository condition is defense in depth, not an enforceable isolation
boundary for untrusted workflow edits. Before making the repository public,
verify runner-access isolation and a safe external-contribution workflow as
recorded in [public-repository readiness](public-repository-readiness.md).
Pull-request preview publication remains disabled until an operator provides
an isolated, protected preview environment and a default-branch-owned
publication workflow that never runs pull-request-controlled code.

Production remains `https://sense6.net`. Both the client and the Pages Function
require that exact origin before writing an anonymous metric, so Pages project
URLs cannot contaminate production counts. A push to `main`
repeats verification, publishes the same checksummed bundle to the production
branch, and confirms the live `build-meta.json` commit plus the read-only site
contract.
