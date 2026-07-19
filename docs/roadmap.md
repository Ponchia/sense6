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

## 2. Extract shared experiment lifecycle primitives

Complete this work before adding several more experiments. Preserve the current
vanilla JavaScript architecture and keep stimulus generation, adaptive math, and
result interpretation inside each experiment.

Extract only behavior that is already repeated:

- mount, cleanup, interruption, and visibility handling;
- setup gates and experiment progress;
- versioned local persistence and copied or exported summaries;
- common result layouts and setup-quality labels; and
- test-only configuration boundaries.

Load experiment modules by route and split locale catalogs by language so a
visitor does not download every experiment and translation on first load. Add a
documented production bundle budget and fail CI when it regresses materially.

The refactor is complete when all existing unit, browser, responsive, and
accessibility tests pass without changing experiment behavior or result copy.

## 3. Build Acutezza only after validation

Acutezza is a calibrated browser sharpness experiment, not an online eye exam.
Its public promise is **Calibrated sharpness and meridional clarity**, with an
expected complete-run duration of about 7–9 minutes.

Follow the [Acutezza research and implementation brief](research/acutezza.md).
Keep the experiment in the roadmap until its calibration, threshold recovery,
test-retest, clinical-review, accessibility, and device-coverage gates pass.

Do not publish an acuity-shaped number when those gates have not been met.
