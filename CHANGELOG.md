# Changelog
<!-- vale Vale.Spelling = NO -->

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Udito—a safe-listening, device-relative hearing lab with a headphone-like
  presentation check, adaptive upper-audibility boundary, and interleaved pitch
  discrimination tracks near 500 Hz and 2 kHz.
- Sample-accurate Web Audio scheduling with short ramped tones, a quiet
  calibration reference, locked-volume setup contract, task controls,
  level-roved pitch comparisons, interruption recovery, and concise local-only
  results.
- Udito unit, complete browser-journey, responsive, and accessibility coverage.
- Multi-exam suite (Sensoria): a gallery landing and hash router hosting each
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
- A rootless, security-hardened `nginx` production container.
- An immutable GitHub Container Registry and Flux deployment workflow.

### Changed

- `Daltonia` now reports display-relative thresholds instead of fixed plate
  percentages or clinical-looking pass/fail categories. Its interface and
  research trail explicitly identify that the implementation isn't validated.

### Fixed

- `Daltonia` no longer forces a directional guess when no gap is visible or
  repeats up to six near-imperceptible trials at its minimum stimulus strength.
  It now includes feedback-based practice, an explicit no-gap response, and
  early axis termination at confirmed experiment boundaries.
