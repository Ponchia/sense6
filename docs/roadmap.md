# Sense6 roadmap
<!-- vale Vale.Spelling = NO -->

Status: current, 2026-07-19

This document records the next product and engineering priorities for Sense6.
It does not promise release dates. Each item stays behind its acceptance gates.

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
- one registry for routes, gallery copy, metadata, metrics, and lazy loading;
- route-level experiment modules and language-level locale chunks;
- substantive localized static entry pages and crawler discovery artifacts;
- strict typed-JavaScript checks for shared contracts; and
- enforced JavaScript and CSS production bundle budgets.

The journal is now a separate versioned store. Existing concise latest-or-best
keys remain compatible and are not rewritten as journal history.

## 2. Validate Acutezza beyond software verification

Acutezza is a calibrated browser sharpness experiment, not an online eye exam.
Its public promise is **Calibrated sharpness and meridional clarity**, with an
expected complete-run duration of about 7–9 minutes.

Follow the [Acutezza research and implementation brief](research/acutezza.md)
and the operational
[external-validation protocol](research/acutezza-validation-protocol.md).
The nonclinical browser implementation now covers calibrated rendering,
threshold recovery simulations, geometry invalidation, accessibility, responsive
behavior, the six supported locales, a machine-readable observation contract,
an evidence validator, and a prespecified collection and analysis protocol. The
remaining work requires real participants and professional coordination:
physical-device observations, paired FrACT comparison, test-retest evidence,
and optometrist or ophthalmologist review. No such outcome is inferred from
software checks.

## Maintenance gates

- Review `src/crawler-policy.js` by its recorded deadline and whenever provider
  guidance changes.
- Keep the entry and route bundle budgets green. Split more common or
  Tetracromia CSS only when a measured regression justifies the extra boundary.
- Keep new structured feature copy separate from the legacy phrase catalogs.
  Migrate older copy to message IDs only when translation authoring or tooling
  demonstrates a concrete need.
- Extend strict typed-JavaScript coverage through shared contracts and new
  modules first. Convert individual experiment modules incrementally when they
  are changed, rather than through an unreviewable suite-wide rewrite.

Until those gates pass, keep every value labelled as a run-specific angular task
threshold and make no clinical acuity, screening, diagnosis, or prescription
claim.
