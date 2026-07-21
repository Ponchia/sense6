# Sense6 roadmap
<!-- vale Vale.Spelling = NO -->

Status: current, 2026-07-21

Lifecycle: current

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
- an automatic strict typed-JavaScript ratchet covering every domain model,
  experiment view, locale catalog, and localization helper, plus shared routing
  boundaries;
- unchecked indexed-access protection, fixed-size numerical tuples, and
  explicit missing-value behavior across those strict boundaries;
- checked public declarations for every lazy-loaded experiment controller;
- guarded phase variants for the Tetracromia session and fail-closed browser and
  persistence boundaries; and
- enforced JavaScript and CSS production bundle budgets;
- checksummed, commit-stamped release artifacts that are built once and reused
  by audit, preview, and production jobs;
- generated per-locale copy with a stale-output check and a true transitive
  startup-graph budget; and
- source complexity and large-file ceilings that require extraction instead of
  allowing the existing controllers and styles to grow.

The journal is now a separate versioned store. Existing concise latest-or-best
keys remain compatible and are not rewritten as journal history.

## 2. Experiment integrity: completed

The five-test evidence audit produced one result-integrity tranche across every
experiment. The implementation now:

- stores an exact protocol and scope passport with every new journal entry and
  keeps legacy or changed methods out of comparisons;
- generates interactive, static, and text-discovery research trails from one
  categorized source ledger without implying validation;
- presents Screen Colour Lab as three fixed-dose observations with no composite,
  score band, best result, radar, or stable-threshold claim;
- locks Daltonia responses through first paint and against duplicates, uses
  matched linear-sRGB luminance distributions, and reports adaptive levels with
  controls and explicit bounds;
- offers three Riflessi scopes with complete denominators, accuracy, quality
  gates, physical setup, interruptions, and separate timing observations;
- offers Focused and Standard Udito scopes with a maximum-level reference,
  audibility anchors, guaranteed Portata controls, recent ceiling evidence, and
  a final unchanged-volume check;
- offers Focused and Standard Acutezza scopes with per-eye and per-condition
  controls, calibration provenance, actual contrast, distance recheck, bounds,
  and 90% model intervals; and
- removes the invalid Meridiani implementation and scorer from production code.

Each selectable scope has an accelerated browser journey. Production schedules
remain separate unit-test invariants. A full Screen Colour Lab result and its
display-invalidation path run in the focused Chromium, Firefox, and WebKit
suite.

## 3. Keep the experimental boundary explicit

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

## Incremental future work

Keep future work evidence-driven and small enough to review:

1. Add deterministic observer simulations for each adaptive method and its
   declared failure modes. Don't change a frozen production protocol in the
   same pull request as the simulation harness.
2. Redesign Screen Colour Lab Standard only after the proposed schedule survives
   simulation. Keep the current fixed 29-block lab available as an explicitly
   exploratory protocol until then.
3. Design any future orientation experiment independently. Don't restore
   Meridiani code until a null observer, inconsistent observer, and replicated
   orientation effect behave as declared.
4. Measure instruction comprehension, completion time, abandonment, fatigue,
   and repeat usability only with a consented study and a separate privacy
   decision. Don't add identifiable raw-result collection to the product.
5. Use local repeated-run exports to design agreement summaries before adding
   stronger repeatability wording. Don't introduce population norms,
   classifications, screening, or clinical claims.

Formal scientific or clinical validation, certification, regulatory approval,
and professional endorsement remain outside the product plan. Future evidence
work improves an honest recreational experiment; it doesn't turn Sense6 into a
medical service.

## Controller and style decomposition backlog

The large controllers and route style sheets remain bounded debt, not a reason
for a suite-wide framework rewrite. Work through them when the owning feature
changes, in this order:

1. Extract Udito's latest-result schema, audio-operation state, and result view;
   then move one guarded phase at a time into the strict typed-JavaScript set.
2. Extract Riflessi's latest-result schema and result view, followed by its
   instrument-specific event coordination.
3. Separate Acutezza calibration, eye-run, and result rendering after its
   current persistence and migration contracts have settled.
4. Continue splitting Tetracromia and Daltonia phase handlers and pure views
   without changing their frozen measurement schedules.
5. Split each route style sheet by stable visual ownership when it approaches
   its recorded ceiling; don't move experiment rules back into global CSS.

Keep every extraction behavior-preserving, covered by the existing production
dose invariants and accelerated browser journeys, and small enough to review
independently.

## Maintenance gates

- Review `src/crawler-policy.js` by its recorded deadline and whenever provider
  guidance changes.
- Keep the About page, `llms.txt`, structured data, README, and experiment limits
  aligned with the permanent experimental boundary.
- Keep the entry, per-route, and combined bundle budgets green. Split
  Tetracromia CSS when the global entry approaches its 125 kB ceiling.
- Keep cognitive complexity at or below 28 and the large-file ceilings green.
  Extract a focused module instead of raising a ceiling without an explicit
  architecture decision.
- Put reusable controls and safety boundaries in
  `src/i18n/message-ids.js`. Migrate older source-keyed prose when it changes;
  don't create a high-risk catalog rewrite only to change key shape.
- Keep the strict typed-JavaScript roots and public controller declarations
  green, including unchecked indexed-access protection. Model fixed-size data
  as tuples and guard variable or external lookups. Convert one controller's
  internal state transitions when that controller changes, rather than through
  an unreviewable suite-wide rewrite. Revisit `.ts` modules only under the
  evidence-based conditions in architecture decision record 0005.
- Add runtime guards and malformed-input tests whenever code crosses storage,
  browser API, dynamic import, or phase-transition boundaries. Types alone do
  not validate those values.

Keep every value labelled as a run-specific, device-relative observation. Make
no clinical acuity, screening, diagnosis, prescription, certification, or
scientific-validity claim.
