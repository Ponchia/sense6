<!-- vale off -->
# Sense6
<!-- vale on -->
<!-- vale Vale.Spelling = NO -->

A small collection of honest, browser-based perception tests. Each exam is a
self-contained module mounted by a hash router behind a shared shell; results
are computed locally and nothing is uploaded.

Live exams:

- **Tetracromia** — an adaptive colour-discrimination lab (threshold, noisy
  field, and hue ordering).
- **Daltonia** — an experimental adaptive colour-vision check. You locate a
  randomized C-shaped gap in luminance-noise dots while three display-relative
  colour directions adapt independently. The result contains thresholds and run
  spread, not a clinical classification.
- **Riflessi** — a device-relative response lab with separate simple-response,
  two-choice, and three-minute sustained-response instruments. It reports robust
  timing, choice cost, accuracy, and within-run stability without a composite
  rating or population percentile.
- **Udito** — a device-relative listening lab with a headphone-confidence
  check, an adaptive upper-audibility boundary, and separate pitch-step
  estimates near 500 Hz and 2 kHz. It reports no dB HL, hearing age, diagnosis,
  or composite score.

Adding an exam: create `src/exams/<id>.js` exporting `meta` and `mount(context)`
(return a cleanup function), then register it in `src/main.js`.

## Background

### Tetracromia

Tetracromia measures how consistently you distinguish colors that a particular
screen can reproduce. It combines three short tasks:

- an adaptive odd-color threshold task;
- a noisy-field discrimination task; and
- hue ordering inspired by the Farnsworth–Munsell method.

Tetracromia does not claim to diagnose tetrachromacy. An ordinary RGB display
cannot produce the independent spectral stimuli needed to test functional
tetrachromacy. The result describes one run under one set of display, lighting,
and observer conditions.

The implementation uses OKLCH to generate perceptually spaced stimuli, maps them
into the sRGB gamut by reducing chroma, and applies a two-correct-down,
one-error-up adaptive staircase. The score is useful for comparing your own runs
under similar conditions. It is not a population percentile.

Research and standards that informed Tetracromia:

- [Jordan et al., *The dimensionality of color vision in carriers of anomalous trichromacy*](https://doi.org/10.1167/10.8.12)
- [X-Rite, Farnsworth–Munsell 100 Hue Test](https://www.xrite.com/visual-assessment-tools/fm-100-hue-test)
- [Cambridge Colour Test reproducibility study](https://hira.hope.ac.uk/id/eprint/3007/)
- [W3C CSS Color 4: OKLab and OKLCH](https://www.w3.org/TR/css-color-4/#ok-lab)
- [Cleveland Clinic, tetrachromacy and the limits of online tests](https://my.clevelandclinic.org/health/articles/tetrachromacy)

### Daltonia

Daltonia begins with two high-contrast practice targets and immediate feedback.
The measured run then presents a C-shaped target with a gap at the top, right,
bottom, or left. Target and field consist of randomly sized and positioned dots
drawn from the same luminance-noise distribution. It schedules up to twelve
presentations for each of three display-relative directions. Two correct
responses reduce the chromatic separation. An incorrect direction or “No gap
visible” response increases it. An axis ends early after confirmed performance
at the experiment floor or repeated misses at the experiment maximum, preventing
unhelpful repetitions at a visibility boundary. Three high-contrast task
controls check that you understood the interaction.

The three directions are derived from a fixed, D65-referenced transformation
from linear sRGB into a normalized LMS-like space. This transformation makes the
stimuli repeatable in browser color coordinates. It does not measure the
spectral output of a display, an observer's cone fundamentals, or anomalous
trichromacy. CIE cone fundamentals are spectral datasets; applying a fixed
matrix to consumer display pixels is only an approximation.

The result reports a threshold estimate and, when the staircase settles away
from a boundary, its run spread and reversals. Boundary runs are reported as
upper or lower measurement bounds. Daltonia applies no population norms and
does not label a run as normal, protan, deutan, or tritan. The implementation
has not been validated on a diagnosed cohort or compared with an anomaloscope,
CAD, Cambridge Colour Test, or validated pseudoisochromatic plates. It is
therefore an experiment, not a screening or diagnostic test.

Research and standards that informed Daltonia:

- [CIE 2006 LMS cone fundamentals for a 2-degree field](https://doi.org/10.25039/CIE.DS.tijidesg)
- [Regan, Reffin, and Mollon, *Luminance noise and the rapid determination of discrimination ellipses in colour deficiency*](https://doi.org/10.1016/0042-6989(94)90203-8)
- [Brettel, Viénot, and Mollon, *Computerized simulation of color appearance for dichromats*](https://doi.org/10.1364/JOSAA.14.002647)
- [Machado, Oliveira, and Fernandes, *A physiologically based model for simulation of color vision deficiency*](https://doi.org/10.1109/TVCG.2009.113)
- [Rabin, Gooch, and Ivan, *Rapid quantification of color vision: the cone contrast test*](https://doi.org/10.1167/iovs.10-6283)
- [Evans et al., *Multicenter evaluation of the color vision screener test*](https://doi.org/10.1364/JOSAA.544985)
- [W3C CSS Color 4 conversion reference](https://www.w3.org/TR/css-color-4/#color-conversion-code)

### Riflessi

Riflessi measures three related but distinct parts of a visual response:

- **Segnale** uses 8 practice responses followed by 20 measured visual signals
  and 2 no-signal checks. Random waits make early responses visible.
- **Scelta** uses 8 practice and 32 measured left-or-right choices. The result
  keeps correct-response time and accuracy together, then reports the difference
  from Segnale as the run's choice cost.
- **Tenuta** uses a 3-minute sustained-response sequence with longer, irregular
  waits. It reports the median response, slowest-fifth gap, first-to-second-half
  drift, misses, and early responses.

Cue presentation is aligned to `requestAnimationFrame`; response events use the
browser's monotonic timestamp when it shares the page's time origin. The page
samples frame cadence, tracks unusually late cue onsets, and discards a current
trial when the tab loses focus. It does not subtract an assumed display,
keyboard, touchscreen, operating-system, or browser delay. Results are therefore
comparable only across repeated runs on the same device and input mode.

Research that informed Riflessi:

- [Deary, Liewald, and Nissan, *A free, easy-to-use, computer-based simple and four-choice reaction time programme*](https://doi.org/10.3758/s13428-010-0024-1)
- [Basner and Dinges, *Maximizing sensitivity of the psychomotor vigilance test while minimizing test duration*](https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/)
- [Bridges et al., *The timing mega-study: comparing a range of experiment generators, both lab-based and online*](https://doi.org/10.7717/peerj.9414)

### Udito

Udito begins with an explicit safe-listening contract. The user starts device
volume low, plays a digitally capped reference, raises it only until it is quiet
and comfortable, and then leaves volume unchanged. The browser cannot know
sound pressure at the eardrum, so the interface never presents its digital
amplitude as dB SPL or dB HL. Tones are short and use 25 ms onset and offset
ramps. Users are told never to raise volume to chase an inaudible high tone and
to stop for discomfort, pain, pressure, or ringing.

The lab keeps three instruments separate:

- **Cuffie** begins with two straightforward practice trials, then uses six
  three-alternative, 200 Hz trials inspired by Woods et al. One interval is 6
  dB quieter, one equal-level decoy has opposing stereo phase, and one is an
  equal-level reference. Five or more quiet targets found is described only as
  headphone-like presentation—not proof that headphones are present.
- **Portata** uses a three-alternative, one-tone interval task. A
  two-correct-up, one-error-down staircase adapts frequency between 2.5 kHz and
  the lower of 18 kHz or 42% of the audio context's sample rate. Two 1 kHz task
  controls check continued task performance. The result uses recent reversals
  and reports their spread or an explicit device-safe ceiling.
- **Intonazione** interleaves independent two-alternative staircases around 500
  Hz and 2 kHz. Two correct responses make the pitch step smaller and one error
  makes it larger. Independent ±3 dB level roving reduces simple loudness cues.
  Each just-noticeable difference is reported as a percentage at its own anchor
  frequency.

`AudioContext.currentTime` and scheduled audio parameters place intervals and
ramps on the Web Audio clock. A hidden tab stops playback and discards the
current presentation; resuming replays that trial. Udito stores only a concise
last-run setup summary. It never records from the microphone or uploads audio.

Research and standards that informed Udito:

- [Woods et al., *Headphone screening to facilitate web-based auditory experiments*](https://doi.org/10.3758/s13414-017-1361-2)
- [Levitt, *Transformed up-down methods in psychoacoustics*](https://doi.org/10.1121/1.1912375)
- [Grassi et al., *PSYCHOACOUSTICS-WEB: A free web interface for online psychoacoustics*](https://pubmed.ncbi.nlm.nih.gov/38709452/)
- [Zhao et al., *Robust and efficient online auditory psychophysics*](https://doi.org/10.1177/23312165221118792)
- [W3C Web Audio API](https://www.w3.org/TR/webaudio-1.0/)
- [WHO–ITU global standard for safe listening devices and systems](https://www.who.int/publications-detail-redirect/9789241515276)

## Install

You need Node.js 22 or later.

```sh
npm install
```

## Usage

Start the local development server:

```sh
npm run dev
```

Open the URL printed by Vite. Complete the screen check before you start the
colour tests, choose one input path before starting Riflessi, or complete
Udito's low-volume reference and volume-lock contract. The site stores only
concise last-run summaries in local browser storage. It does not send session
data to a server.

The interface uses [`@ponchia/ui`](https://github.com/Ponchia/bronto-ui) for its
tokens, typography, layout primitives, controls, feedback, theme behavior, and
site shell. Product-specific stimulus geometry remains local to this project.

## Localization

Sense6 supports English, Italian, German, French, Spanish, and Portuguese.
Locale-aware hash routes make every exam directly addressable, for example
`#/it/udito`. Existing routes such as `#/udito` remain valid and are normalized
to the active locale.

On a first visit, Sense6 selects the first supported language reported by the
browser and otherwise falls back to English. A choice made in the header is
stored under `sense6:locale` in local storage. Changing the language keeps the
current exam open. The runtime also updates the document language, page title,
metadata, internal links, accessibility labels, number formatting, and copied
result summaries.

English source phrases and their five translations live in `src/locales.js`.
Add each new user-facing phrase there with the same placeholders in every
language. `tests/i18n.test.js` rejects missing values, duplicate English source
phrases, and placeholder drift. Browser tests cover locale routing, detection,
persistence, accessibility, and mobile overflow.

## Develop and test

Run the deterministic colour-math, timing, adaptive hearing, and session-engine
tests:

```sh
npm test
```

Check the JavaScript and CSS source with Biome:

```sh
npm run lint
```

Build the production bundle:

```sh
npm run build
```

Run the browser, accessibility, and responsive checks:

```sh
npm run test:e2e
```

Run all four gates:

```sh
npm run check
```

## Deploy

Every push to `main` runs the complete lint, unit, build, browser, responsive,
and accessibility gate. After that gate passes, GitHub Actions builds `dist/`
and uploads the verified static bundle directly to Cloudflare Pages.

The production site is available at
[`sense6.net`](https://sense6.net). Cloudflare Pages terminates TLS and serves
the files from its edge; the site has no application server or origin in the
personal Kubernetes cluster. The old
[`tetracromia.brontolotto.observer`](https://tetracromia.brontolotto.observer)
hostname redirects to the canonical domain.

The deployment workflow requires the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repository secrets. Scope the token to Cloudflare Pages
edits for the account that owns `sense6.net`.

## Scientific limits

Browser color output depends on the panel, color profile, browser, brightness,
ambient light, viewing angle, and color-altering operating-system features.
Tetracromia therefore keeps the stimulus surround neutral, detects the gamut
reported by the browser, and reports thresholds as display-relative values.

Browser response timing depends on the display refresh path, input hardware,
operating system, browser, and current device load. Riflessi exposes timing
health and input mode but cannot calibrate those delays. It does not assess
fatigue, concussion, driving fitness, neurological health, or any other medical
or occupational condition.

Browser audio depends on device volume, digital processing, sample rate,
headphone frequency response and fit, assistive devices, room noise, and the
listener. Udito has no acoustic coupler, calibrated transducer, microphone, or
sound-level measurement. Its upper boundary and pitch steps therefore describe
only one run under one setup. They cannot establish clinical hearing thresholds,
hearing loss, hearing age, safe listening ability, or fitness for medical or
occupational use.

Do not use this site for medical or occupational decisions. Use a validated
clinical or physical test administered under controlled conditions when the
result matters.

## Maintainer

[Ponchia](https://github.com/Ponchia)

## License

[MIT](LICENSE)
