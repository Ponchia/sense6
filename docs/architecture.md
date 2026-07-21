# Sense6 architecture
<!-- vale Vale.Spelling = NO -->

Status: current, 2026-07-21

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
and uncertainty, but it can't turn a browser task into a clinical instrument.

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
| Shell and router | `src/main.js`, `src/router.js`, `src/routes.js` | Resolve locale-aware routes, mount one view, and dispose the previous view |
| Service contracts | `src/exams/contracts.js` | Define experiment identity, metric names, and journal-comparison policy |
| Presentation registry | `src/exams/registry.js` | Define gallery and static-page metadata plus lazy experiment loaders |
| Protocol passports | `src/exams/protocols.js` | Freeze method versions, selectable profiles, schedule digests, stopping rules, and interpretation boundaries |
| Evidence ledger | `src/exams/sources.js` | Classify canonical sources as method, boundary, comparator, or exact Sense6 validation evidence |
| Experiment controllers | `src/exams/*.js`, `src/exams/*.d.ts` | Coordinate setup, response handling, phase changes, and results for one experiment; declarations define their checked public mount boundary |
| Result schemas | `src/exams/results/*.js` | Validate and migrate experiment-specific latest-result payloads without coupling service contracts to route code |
| Experiment views | `src/exams/views/*.js` | Produce pure markup for large landing or phase views without owning runtime state |
| Domain models | `src/lib/*.js` | Implement strictly checked adaptive tracks, schedules, summaries, persistence, lifecycle behavior, and guarded state transitions |
| Shared landing views | `src/exams/landing.js` | Render repeated instrument, method, and research structures |
| Localization | `src/i18n.js`, `src/i18n/message-ids.js`, `src/i18n/catalog-audit.js`, `src/locales/` | Generate coordinated locale rows, load one catalog, translate stable shared IDs and source-keyed prose, apply locale metadata, and report catalog drift |
| Static generator | `scripts/generate-static-pages.mjs` | Produce localized discovery HTML, metadata, sitemap, crawler files, and the 404 page |
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
7. On the canonical production origin only, completion sends one allowlisted
   aggregate counter with no result or setup data.

Render tokens prevent a slower dynamic import from overwriting a newer route.
Gallery, Tetracromia, the other experiments, About, privacy, and journal styles
load on their own route where practical.

## Data and privacy

The current design has three deliberately separate stores:

- concise versioned latest-result records in browser storage;
- the versioned, validated multi-run journal in browser storage; and
- anonymous daily aggregate counts in D1.

Don't merge these models. The metrics endpoint must never accept result,
setup, locale, timing, or visitor data. Journal exports become portable files
only when the person explicitly saves them.

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

Follow `adding-an-experiment.md` for the complete extension contract.
Tests compare the service-contract IDs with the presentation registry, so a
partially registered experiment fails early.

## Quality gates

`npm run check` is the behavioral release gate. It covers formatting, strict
typed JavaScript, locale-catalog integrity, unit coverage, production build,
static output, browser journeys, responsive layouts, and accessibility.
`npm run check:release` adds generated HTML, internal-link, and production-site
audits. Chromium and
the mobile Chromium profile run the complete journey suite. A full Screen
Colour Lab result journey and active-run invalidation also run in Firefox and
WebKit as the selected compatibility paths.

The type gate automatically includes every module under `src/lib/`,
`src/exams/results/`, `src/exams/views/`, `src/i18n/`, and `src/locales/`, plus
named shared runtime boundaries and controller declarations. The ratchet fails
if the configuration omits a strict file. It also rejects type-suppression
comments and explicit JSDoc `any`. `noUncheckedIndexedAccess` requires fixed
tuples or explicit handling for array, record, regular-expression, and other
indexed lookups.
Values crossing browser and storage boundaries still require runtime
validation.

CI runs browser projects first, then one release job creates `dist/`, stamps the
commit in `build-meta.json`, writes and verifies a SHA-256 manifest, and audits
the production site. When deployment is enabled, that same job publishes its
verified working tree without rebuilding it. This keeps artifact identity exact
without depending on account-wide artifact storage.

Raw bundle ceilings are:

- initial JavaScript: 110 kB;
- entry CSS: 125 kB;
- each route style sheet: 40 kB; and
- entry CSS plus the largest route style sheet: 150 kB.

The static-output test traverses the Vite manifest for the full initial locale
graph, discovers generated route style sheets instead of keeping a filename
allowlist, and verifies the Cloudflare headers and function-routing contract.

## Known pressure points

Experiment controllers still contain substantial unchecked phase-specific
event orchestration. The type gate checks their public `mount(context)`
contract, the cognitive-complexity gate rejects functions above 28, and the
maintainability test prevents known large controllers and style sheets from
growing beyond their decomposition ceilings. Acutezza's intro, the strict
result-schema boundary, and Tetracromia's extracted views and event handlers
establish the incremental pattern: don't add a suite-wide base controller.
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
sheet because several experiments use them. Tetracromia-owned visuals and
phase layouts live in `src/styles/tetracromia.css`; keep that ownership boundary
when expanding the color lab.

## Delivery environments

Every same-repository pull request first passes the browser matrix and complete
release gate, then publishes the checksummed working tree to a stable Cloudflare
Pages branch preview. CI smoke-tests the real preview URL, including substantive
localized HTML, `X-Robots-Tag: noindex`, and a closed metrics endpoint. Fork
pull requests run verification without receiving deployment credentials or a
preview.

Production remains `https://sense6.net`. Both the client and the Pages Function
require that exact origin before writing an anonymous metric, so Pages project
URLs and branch previews cannot contaminate production counts. A push to `main`
repeats verification, publishes the same checksummed bundle to the production
branch, and confirms the live `build-meta.json` commit plus the read-only site
contract.
