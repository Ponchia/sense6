# Sense6 architecture
<!-- vale Vale.Spelling = NO -->

Status: current, 2026-07-20

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
| Shell and router | `src/main.js`, `src/router.js` | Resolve locale-aware routes, mount one view, and dispose the previous view |
| Service contracts | `src/exams/contracts.js` | Define experiment identity, metric names, and journal-comparison policy |
| Presentation registry | `src/exams/registry.js` | Define gallery and static-page metadata plus lazy experiment loaders |
| Experiment controllers | `src/exams/*.js` | Coordinate setup, presentation, response handling, and results for one experiment |
| Domain models | `src/lib/*.js` | Implement adaptive tracks, schedules, summaries, persistence, and lifecycle behavior |
| Shared landing views | `src/exams/landing.js` | Render repeated instrument, method, and research structures |
| Localization | `src/i18n.js`, `src/i18n/message-ids.js`, `src/locales/` | Load one catalog, translate stable shared IDs and legacy source-keyed prose, and apply locale metadata |
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
6. A completed run writes a validated journal entry locally and sends only an
   allowlisted completion counter.

Render tokens prevent a slower dynamic import from overwriting a newer
route. Gallery, experiment, About, privacy, and journal styles load on their
own route where practical.

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
need it. Current examples are experiment contracts, lifecycle cleanup,
persistence envelopes, stable message IDs, and landing-section renderers.

Keep stimulus generation, task schedules, interpretation, and result wording
inside the owning experiment and its domain module. A generic experiment engine
would hide meaningful differences among color, timing, audio, and acuity
tasks.

Follow `adding-an-experiment.md` for the complete extension contract.
Tests compare the service-contract IDs with the presentation registry, so a
partially registered experiment fails early.

## Quality gates

`npm run check` is the release gate. It covers formatting, strict typed
JavaScript, unit coverage, production build, static output, browser journeys,
responsive layouts, and accessibility.

Raw bundle ceilings are:

- initial JavaScript: 110 kB;
- entry CSS: 125 kB;
- each route style sheet: 40 kB; and
- entry CSS plus the largest route style sheet: 150 kB.

The static-output test discovers generated route style sheets instead of keeping
a filename allowlist.

## Known pressure points

Experiment controllers still contain substantial phase-specific view and event
orchestration. Don't address that with a suite-wide base controller. When you
change one phase, extract its pure markup or state transition behind a small
typed interface and keep the measurement behavior covered.

Legacy localization uses English source prose as catalog keys. Stable IDs now
cover reusable controls and safety boundaries. Migrate older prose when it
changes. A wholesale key conversion would create translation risk without a
user-visible benefit.

Tetracromia still shares part of the entry style sheet because several shell
and laboratory patterns use it. Split that CSS only when selector
ownership is clear or the entry approaches its ceiling.
