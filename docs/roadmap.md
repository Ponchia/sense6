# Sense6 roadmap
<!-- vale Vale.Spelling = NO -->

Status: current, 2026-07-20

This document records the current product and engineering priorities for
Sense6. It does not promise release dates.

## 1. Private measurement journal: completed

Sense6 now records a local-only, structured journal so you can compare repeated
runs without creating an account or uploading measurements.

The journal now:

- retains multiple versioned results for every experiment;
- records a setup passport with the device, input mode, correction state, and
  other experiment-specific conditions needed to judge comparability;
- labels two runs as comparable, comparable with caution, or not comparable;
- shows change together with uncertainty and measurement bounds;
- keeps each instrument separate instead of producing a suite-wide score; and
- exports and imports a documented local file without contacting a server.

Automated tests cover schema validation, the 100-entry storage limit, malformed
and future imports, idempotent merging, cross-locale rendering, individual and
complete deletion, accessibility, and recording from all five experiments.

## Completed engineering foundations

The suite now preserves its vanilla JavaScript architecture while sharing only
the behavior that was already repeated. Experiment-specific stimulus
generation, adaptive math, and result interpretation remain inside each module.

The completed foundation includes:

- an idempotent mount lifecycle with abort-driven listener cleanup;
- versioned, validated local persistence with legacy-result migration;
- a typed exam contract for identity, metrics, and journal-comparison policy;
- a presentation registry for routes, gallery copy, metadata, and lazy loading;
- shared renderers for repeated instrument, method, and research sections;
- route-level experiment modules and language-level locale chunks;
- route-scoped gallery CSS with independent entry, route, and combined budgets;
- substantive localized static entry pages and crawler discovery artifacts;
- stable message IDs for shared controls and safety boundaries;
- strict typed-JavaScript checks for shared contracts and new modules; and
- enforced JavaScript and CSS production bundle budgets.

The journal is now a separate versioned store. Existing concise latest-or-best
keys remain compatible and are not rewritten as journal history.

## 2. Keep the experimental boundary explicit

Sense6 is permanently an experimental personal project for curiosity and fun.
Formal scientific or clinical validation, certification, regulatory approval,
and professional review are not product goals. The suite must not imply that
any of them are planned.

The localized About page is the public source of truth for this boundary. It
explains authorship, how adaptive browser tasks work, what each experiment can
and cannot describe, device dependence, privacy, and the difference between
software verification and scientific validity. Experiment pages and copied
results must remain consistent with it.

Published research and standards may inform a task design. Automated tests may
show that an implementation behaves as designed. Neither makes a Sense6 result
validated, certified, diagnostic, or suitable for medical or occupational use.

## Maintenance gates

- Review `src/crawler-policy.js` by its recorded deadline and whenever provider
  guidance changes.
- Keep the About page, `llms.txt`, structured data, README, and experiment limits
  aligned with the permanent experimental boundary.
- Keep the entry, per-route, and combined bundle budgets green. Split
  Tetracromia CSS when the global entry approaches its 125 kB ceiling.
- Put reusable controls and safety boundaries in
  `src/i18n/message-ids.js`. Migrate older source-keyed prose when it changes;
  do not create a high-risk catalog rewrite only to change key shape.
- Extend strict typed-JavaScript coverage through shared contracts and new
  modules first. Convert individual experiment modules incrementally when they
  are changed, rather than through an unreviewable suite-wide rewrite. Revisit
  TypeScript only under the conditions in ADR 0005.

Keep every value labelled as a run-specific, device-relative observation. Make
no clinical acuity, screening, diagnosis, prescription, certification, or
scientific-validity claim.
