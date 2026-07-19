# Changelog
<!-- vale Vale.Spelling = NO -->

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

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

### Changed

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

- The unused Acutezza external-validation protocol, observation schema, and
  evidence validator, which contradicted the permanent experimental product
  boundary.

### Fixed

- Playwright runs can select a strict, isolated server port so concurrent
  worktrees do not reuse and later lose one another's development server.
- `Daltonia` no longer forces a directional guess when no gap is visible or
  repeats up to six near-imperceptible trials at its minimum stimulus strength.
  It now includes feedback-based practice, an explicit no-gap response, and
  early axis termination at confirmed experiment boundaries.
