# Changelog
<!-- vale Vale.Spelling = NO -->
<!-- markdownlint-disable MD024 -->

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Public bug and improvement forms, maintainer review routing, and optional
  Ko-fi sponsorship in GitHub.
- Contributor, security, and public-repository preparation guides, with generated
  distribution notices for the runtime UI code and Doto fonts.
- Sense6 Learn: five source-traceable perception guides, an interactive browser
  timing illustration, and full Learn editions in all 12 published languages
  (72 Learn routes). Each guide links to its matching experiment; research
  context is also reachable from experiment results and the private journal.
- Reciprocal localized search metadata and correctly localized share previews
  for Learn, bringing the generated canonical site to 157 URLs.
- A documented consented visitor-comprehension review, human translation QA
  procedure and Google/Bing indexing-evidence plan. These are plans for
  independent verification, not claims that participation or indexing occurred.

- Anonymous per-experiment landing-view totals, backed by a forward D1
  migration, so aggregate view-to-start conversion no longer requires visitor
  or session identifiers.
- A checksummed, commit-stamped release working tree audited and deployed
  unchanged in one job after the browser matrix passes.
- Forward D1 migration coverage for every runtime metric pair, exact Cloudflare
  header and function-route tests, and a read-only production smoke contract.
- Complexity, large-file, locale-generation, audit-discovery, coverage-report,
  and true transitive startup-bundle ratchets.

### Changed

- Public repository maintenance now documents the completed hosted launch,
  sponsorship and branch-cleanup controls; package metadata includes the
  maintained project, issue, and optional funding destinations.
- Standard GitHub-hosted Ubuntu runners for verification, releases, and scheduled
  audits, with the same fork verification gates and no persisted checkout token.
- Production releases select a main-only protected environment; pull-request
  verification remains unprivileged and cannot publish.
- Udito and Riflessi result markup and copied summaries now have focused,
  strictly checked view modules with lower controller growth ceilings.
- A shorter repository entry point, explicit generated-file ownership, and a
  Node.js 22.19 minimum matching the locked tools; Node.js 24 is recorded for CI parity.
- Earlier mobile preparation actions and faster gallery browsing, clearer
  first-run instructions and results across five labs, and more useful empty
  and saved-journal navigation.
- Better visual-regression approval scoping, one-week diagnostic retention,
  route-complete scheduled Lighthouse coverage and Bronto UI 0.16.1 adoption.

- The scheduled link audit retries transient publisher failures with bounded
  per-host concurrency. The passive security audit uses a reviewed ZAP
  baseline and no longer depends on account-wide artifact capacity.
- Static structured data, Udito landing markup, Acutezza result presentation,
  and the large Riflessi and Tetracromia style surfaces now have focused
  modules with lower growth ceilings.
- Locale switching is last-request-wins, persistent shell translation uses
  stable source attributes, and coordinated copy is generated into per-locale
  payloads without loading all catalogs on startup.
- Route, research-source, result-schema, and lifecycle boundaries are separated
  so unrelated policy no longer enters the initial browser graph.
- Repository and release documentation now distinguish current architecture,
  research history, decisions, runbooks, and bounded decomposition work.

### Fixed

- Card backgrounds now switch with theme text instead of briefly interpolating
  through low-contrast colours. Deterministic theme-transition checks cover the
  five experiment landing pages in desktop and mobile Chromium.
- Udito geometry checks inspect a finite text-node snapshot and count distinct
  visual lines instead of inline rectangles. All six responsive layouts have
  independent verification, including the high-zoom case in PR smoke.
- Completed-run clipboard and share operations no longer post feedback after
  restarting or leaving any of the five experiments. Udito also invalidates
  delayed reference playback when the selected output setup changes.
- Latest-result validation rejects malformed hearing, reflex, colour-axis,
  and acuity records while retaining supported historical shapes and storage
  envelopes. Unsupported older Daltonia measurement schemas stay untouched.
- Development telemetry checks now honor configurable HTTP loopback ports;
  production transport remains restricted to the canonical site origin.
- Audio cancellation across delayed context initialization and teardown, and
  clipboard feedback that could appear after leaving Screen Colour Lab.
- Journal byte-budget handling so combined imports preserve existing data and
  exports remain compatible with the importer.
- External-link audit policy now covers its automatically loaded exception
  registry and correctly matches the canonical site hostname.
- Correct anonymous Daltonia route-event identity and translated live-region
  announcements in colour-vision tasks, without changing experimental methods.

- Tetracromia keeps its active-session controls visible after phase changes,
  the gallery exposes a direct above-fold path to all tests, and Udito's
  latest-result browser test no longer rewrites its own malformed fixture.
- Experiment mounts, delayed journal imports, Udito playback, and locale changes
  no longer commit stale asynchronous work after navigation or a newer request.
- Acutezza metrics and comparisons, journal import counts, malformed payload
  handling, and local persistence failures now fail closed and report truthful
  outcomes.
- Static template generation, route-owned styles, forced-colors behavior, and
  social-card coverage now detect drift instead of silently emitting partial
  output.

## [0.1.0] - 2026-07-21

### Added

- Frozen protocol passports for every experiment and selectable scope, stored
  with quality evidence in the local journal and used as a comparison cohort.
- A categorized canonical evidence ledger that generates interactive, localized
  static, and text-discovery source trails without implying validation.
- Selectable Riflessi, Udito, and Acutezza scopes with independent-repeat
  actions and browser journeys for every scope.
- A complete Screen Colour Lab result journey and display-invalidation journey
  in the focused Chromium, Firefox, and WebKit compatibility suite.
- A source-backed evidence and product audit of all five experiments, covering
  shipped doses and timings, reference gaps, competitor and open-source
  precedents, interface findings, result completeness, depth choices, and a
  prioritized integrity and validation backlog.
- An architecture overview, an experiment extension guide, and an accepted
  decision record for continuing with incremental typed JavaScript.
- A typed exam service contract that centralizes experiment identity, analytics
  names, journal-comparison fields, and distance tolerances.
- Stable localization IDs for reusable controls and safety boundaries, with
  catalog-completeness tests.
- Shared, escaped renderers for repeated instrument, method, and research
  sections on experiment landing pages.
- A twelve-language About and methodology page with visible authorship, permanent
  experimental boundaries, per-experiment interpretation limits, privacy and
  quality explanations, research links, static HTML, and structured data.
- A local-only, versioned multi-run journal with setup passports,
  instrument-specific comparability, uncertainty and bound-aware changes,
  validated import/export, individual and complete deletion, twelve localized
  routes, and recording from all five experiments.
- A centralized, dated crawler policy with an automated review deadline.
- Privacy-preserving product metrics that store only daily aggregate page-load,
  measured-start, measured-completion, and future report-download counts in D1,
  with no visitor or event records.
- Acutezza's research and implementation brief, together with a product and
  engineering roadmap for repeated-run history and suite scaling.
- Cloudflare Pages deployment with the existing full verification gate,
  production security headers, and immutable asset caching.
- English, Italian, German, French, Spanish, European and Brazilian Portuguese,
  Arabic, Japanese, Korean, Hindi, and Simplified Chinese interfaces across the
  gallery, all five exams, safety/setup flows, live tasks, result screens,
  accessibility labels, metadata, privacy notice, journal, and copied summaries.
- Localized static entry pages for every gallery, exam, About, journal, and
  privacy route, with substantive no-JavaScript content, canonical and
  `hreflang` metadata,
  structured data, an exact sitemap, crawler policy, `llms.txt`, and a real 404.
- Locale-aware canonical paths, historic hash-link compatibility, first-visit
  browser-language detection, persistent language selection, English fallback,
  localized number formatting, and multilingual accessibility and responsive
  coverage.
- BCP 47-aware regional locale matching, Arabic right-to-left document flow,
  non-Latin typography, and direction-isolated experimental controls that keep
  physical left/right stimuli and numbered keyboard mappings stable.
- Udito—a safe-listening, device-relative hearing lab with a headphone-like
  presentation check, adaptive upper-audibility boundary, and interleaved pitch
  discrimination tracks near 500 Hz and 2 kHz.
- Sample-accurate Web Audio scheduling with short ramped tones, a quiet
  calibration reference, locked-volume setup contract, task controls,
  level-roved pitch comparisons, interruption recovery, and concise local-only
  results.
- Udito unit, complete browser-journey, responsive, and accessibility coverage.
- Multi-exam suite (Sense6): a gallery landing and client router hosting each
  test as a self-contained mount/unmount module.
- `Daltonia`: an experimental adaptive colour-vision check with randomized
  Landolt-C orientation, luminance-noise dots, three interleaved display-relative
  staircases, repeated task controls, and threshold uncertainty.
- Riflessi—a three-instrument, device-relative response lab covering simple
  visual response, balanced two-choice response, and a three-minute sustained
  response sequence.
- Riflessi result metrics for typical response, choice cost and accuracy,
  slow-response tail, within-run drift, early responses, misses, input mode, and
  page-observed timing health—without a composite score or population norm.
- Focus and visibility interruption handling that discards the active timing
  trial and resumes with a fresh randomized wait.
- Adaptive threshold and noisy-field color discrimination instruments.
- Touch, pointer, and keyboard-compatible hue ordering.
- Display setup check and browser-reported gamut indicator.
- Local, device-relative result profile with no server upload.
- Scientific limits and source trail for the test design.
- GitHub Actions verification for formatting, unit, build, browser, responsive,
  and accessibility checks.
- A shared exam registry, lazy experiment loading, per-language locale chunks,
  versioned and validated result persistence, and an idempotent experiment
  lifecycle with abort-driven cleanup.
- Typed-JavaScript contract checks, coverage thresholds for shared lifecycle
  and persistence code, generated-static-output tests, and production bundle
  budgets.
- An automatic strict typed-JavaScript ratchet for domain models, experiment
  views, localization, locale catalogs, shared routing boundaries, and public
  experiment-controller module declarations.
- Runtime state guards and failure-mode tests for phase-specific color-session
  operations, unavailable canvas contexts, and malformed result envelopes.
- Failure-mode tests for invalid random sources, missing adaptive-test state,
  sparse schedules, empty statistics, and out-of-range sequence operations.

### Changed

- Tetracromia is now Screen Colour Lab: a fixed 29-block experiment with three
  separate observations and no composite, score band, best result, profile, or
  radar.
- Daltonia now reports exploratory ending adaptive levels, track evidence, and
  bounds instead of implying precise cone thresholds.
- Riflessi, Udito, and Acutezza results now record the selected scope, expanded
  setup provenance, and instrument-specific quality evidence.
- Result and copied-summary language consistently describes run-level
  observations, while keeping the recreational, nonclinical boundary visible.
- The shared interface now uses Bronto UI 0.7, supported alert anatomy and
  semantic tones, and an automated class-and-token contract check in CI.
- Gallery CSS now loads only on the gallery route. Bundle checks discover every
  route stylesheet and enforce separate entry, route, and combined ceilings.
- Metrics and journal validation now consume the exam service contract instead
  of maintaining separate hardcoded experiment lists.
- Domain, routing, registry, and localization boundaries now narrow browser,
  storage, dynamic-import, and catalog values without JSDoc `any` or type
  suppressions.
- The strict typed-JavaScript program now rejects unchecked indexed access.
  Fixed numerical structures use tuple contracts, while variable lookups define
  explicit fallback, rejection, or corrupt-state behavior.
- Sense6 now explicitly positions every task as a recreational experiment for
  curiosity and fun. Formal validation, certification, regulatory approval, and
  professional review are not planned; software tests prove implementation
  behavior only.
- The npm package now uses the `sense6` project name, and the public footer no
  longer links to a private source repository.
- Acutezza's roadmap promise now describes calibrated sharpness and meridional
  clarity as a 7–9 minute protocol instead of a two-minute acuity and
  astigmatism test.
- The public suite name is now Sense6, and its canonical URL is
  `https://sense6.net`.
- Production hosting now serves the static bundle from Cloudflare Pages instead
  of the personal Kubernetes cluster.
- Experiment routes now use crawlable localized paths and load only the active
  experiment and language instead of the complete suite on first visit.
- Cloudflare Single Redirect rules send `www.sense6.net` and the former
  `tetracromia.brontolotto.observer` hostname to the canonical domain.
- `Daltonia` now reports display-relative thresholds instead of fixed plate
  percentages or clinical-looking pass/fail categories. Its interface and
  research trail explicitly identify that the implementation isn't validated.

### Removed

- The suspended Acutezza Meridiani scheduler, scorer, canvas renderer, styles,
  and tests. A future orientation experiment requires a new simulated and
  piloted protocol.
- Tetracromia's composite score, score bands, best-result treatment, profile
  radar, and their dead styles.
- The unused Acutezza external-validation protocol, observation schema, and
  evidence validator, which contradicted the permanent experimental product
  boundary.

### Fixed

- Daltonia rejects pre-paint, invalid, and duplicate responses and uses matched
  linear-sRGB luminance distributions for target and field dots.
- Riflessi requires complete schedules, clean no-signal checks, and interruption-
  free runs for strongest quality, while retaining scheduled and valid
  denominators and separate choice accuracy.
- Udito presents all Portata controls before convergence, requires audibility
  anchors and a final unchanged-volume confirmation, and treats technical
  ceilings and reversal ranges explicitly.
- Acutezza applies controls per eye and condition, stores measured versus
  assumed calibration, actual contrast and distance recheck, and labels its 90%
  interval as a model interval rather than generic uncertainty.
- Legacy journal entries migrate into an explicit noncomparable protocol cohort
  instead of inheriting a current method.
- Malformed result envelopes can no longer be mistaken for valid legacy result
  records.
- Invalid sequence swaps no longer mutate session state, and malformed adaptive
  schedules and posterior grids now fail with explicit integrity errors.
- Playwright runs can select a strict, isolated server port so concurrent
  worktrees do not reuse and later lose one another's development server.
- `Daltonia` no longer forces a directional guess when no gap is visible or
  repeats up to six near-imperceptible trials at its minimum stimulus strength.
  It now includes feedback-based practice, an explicit no-gap response, and
  early axis termination at confirmed experiment boundaries.
