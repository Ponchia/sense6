# Sense6 roadmap
<!-- vale Vale.Spelling = NO -->

Status: current, 2026-07-19

This document records the next product and engineering priorities for Sense6.
It does not promise release dates. Each item stays behind its acceptance gates.

## 1. Add a private measurement journal

Sense6 currently stores only a concise last or best result for each experiment.
Add a local-only journal so you can compare repeated runs without creating an
account or uploading measurements.

The journal must:

- retain multiple versioned results for every experiment;
- record a setup passport with the device, input mode, correction state, and
  other experiment-specific conditions needed to judge comparability;
- label two runs as comparable, comparable with caution, or not comparable;
- show change together with uncertainty and measurement bounds;
- keep each instrument separate instead of producing a suite-wide score; and
- export and import a documented local file without contacting a server.

Before release, test schema migrations, storage limits, malformed imports,
cross-locale summaries, and deletion of individual or all saved runs.

## Completed engineering foundations

The suite now preserves its vanilla JavaScript architecture while sharing only
the behavior that was already repeated. Experiment-specific stimulus
generation, adaptive math, and result interpretation remain inside each module.

The completed foundation includes:

- an idempotent mount lifecycle with abort-driven listener cleanup;
- versioned, validated local persistence with legacy-result migration;
- one registry for routes, gallery copy, metadata, metrics, and lazy loading;
- route-level experiment modules and language-level locale chunks;
- substantive localized static entry pages and crawler discovery artifacts;
- strict typed-JavaScript checks for shared contracts; and
- enforced JavaScript and CSS production bundle budgets.

The private journal remains separate product work: the storage adapter can
migrate a concise last or best result, but it doesn't yet keep a multi-run
history or provide import and export.

## 2. Validate Acutezza beyond software verification

Acutezza is a calibrated browser sharpness experiment, not an online eye exam.
Its public promise is **Calibrated sharpness and meridional clarity**, with an
expected complete-run duration of about 7–9 minutes.

Follow the [Acutezza research and implementation brief](research/acutezza.md).
The nonclinical browser implementation now covers calibrated rendering,
threshold recovery simulations, geometry invalidation, accessibility, responsive
behavior, and the six supported locales. The remaining work is physical-device
coverage, comparison with FrACT, test-retest evidence, and optometrist or
ophthalmologist review.

Until those gates pass, keep every value labelled as a run-specific angular task
threshold and make no clinical acuity, screening, diagnosis, or prescription
claim.
