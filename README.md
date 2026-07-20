<!-- vale off -->
# Sense6
<!-- vale on -->
<!-- vale Vale.Spelling = NO -->

A small collection of experimental browser-based perception tests, made for
curiosity and fun. Every gallery, exam, About, journal, and privacy route has a
substantive localized HTML entry page for people, search engines, and
text-retrieval tools. JavaScript then mounts the selected experiment as a
progressively enhanced module; results and answers remain local. The service
stores only anonymous daily activity totals. Sense6 is not validated,
certified, diagnostic, or intended to become a medical product.

The localized [About page](https://sense6.net/en/about/) explains how the tasks
work, who maintains them, their privacy boundary, and what each result can and
cannot describe.

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
- **Acutezza** — a calibrated near-vision perception experiment with separate
  high-contrast Landolt-ring detail, low-contrast cost, and repeated meridional
  clarity observations for each eye. It reports angular task thresholds and
  uncertainty, never 20/20, a diagnosis, astigmatism, or a prescription.

Read the [architecture overview](docs/architecture.md) before changing a
cross-cutting boundary. To add an experiment, follow the
[experiment extension guide](docs/adding-an-experiment.md). It covers the
service contract, presentation registry, domain model, mount lifecycle,
journal passport, localization, route stylesheet, static content, and required
tests.

Acutezza's source-backed [research and implementation
brief](docs/research/acutezza.md) records the method, product boundary, completed
software checks, and the permanent distinction between implementation
verification and scientific validity.

The [product and engineering roadmap](docs/roadmap.md) records the completed
private repeated-run journal and the permanent experimental product boundary.
The shared lifecycle, versioned persistence, route-level loading, and bundle
budgets are established foundations.

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
Udito's low-volume reference and volume-lock contract. Each completed run adds
a structured entry to the private journal in local browser storage. Sense6 does
not send session answers, measurements, journal entries, or results to a
server. It sends one allowlisted event name and test name when a page loads or a
measured run starts or completes.

## Private measurement journal

Open `/{locale}/journal/`, for example `/en/journal/`, to review up to 100 saved
runs. Each entry contains structured measurements, uncertainty or measurement
bounds when an instrument provides them, and a setup passport with the
conditions needed for comparison. Comparisons are instrument-specific and use
three labels: comparable, comparable with caution, or not comparable. Sense6
does not convert the five instruments into a suite-wide score.

You can delete one entry, delete the complete journal, export a documented JSON
file, or merge that file back into a browser. Imports are size-limited,
validated, schema-versioned, and idempotent by entry ID. The journal remains on
the device unless you deliberately save or move an exported file. The compact
legacy latest-or-best result keys remain readable for compatibility.

## Privacy-preserving metrics

Sense6 doesn't use analytics cookies, browser storage, identifiers,
fingerprints, IP addresses, user-agent strings, referrers, answers, scores, or
exact event timestamps for product metrics. A Cloudflare Pages Function accepts
only an allowlisted event and test name. The server chooses the coordinated
universal time day and atomically increments one row in D1. The resulting table
contains only `day`, `test`, `metric`, and `count`.

`site_loaded` measures document loads, not unique people. Reloads and bots can
increase the count. `test_started` begins at the first measured block after any
practice. Sense6 records `test_completed` only when the result view appears.
Sense6 reserves `report_downloaded` for a future report action.

The write endpoint has no read, update, or delete operation. It requires a JSON
request whose request URL and `Origin` are both exactly `https://sense6.net`,
rejects unknown fields and event combinations, limits the body to 128 bytes,
and fails closed when D1 is unavailable. Production builds also disable metric
sends away from that canonical origin. Analytics availability can't block a
test.

The interface uses [`@ponchia/ui`](https://github.com/Ponchia/bronto-ui) for its
tokens, typography, layout primitives, controls, feedback, theme behavior, and
site shell. Product-specific stimulus geometry remains local to this project.

## Localization

Sense6 supports English, Italian, German, French, Spanish, European Portuguese,
Brazilian Portuguese, Arabic, Japanese, Korean, Hindi, and Simplified Chinese.
Locale-aware paths make every exam directly addressable, for example
`/it/udito/`, `/pt-br/acutezza/`, or `/zh-hans/riflessi/`. Historic hash links
such as `#/it/udito` and `#/udito` remain valid and are replaced with the
corresponding canonical path in the browser. Regional language-tag paths such
as `/pt-BR/` and `/zh-CN/` redirect to their canonical locale routes.

On a first visit, Sense6 selects the first supported language reported by the
browser and otherwise falls back to English. A choice made in the header is
stored under `sense6:locale` in local storage. Changing the language keeps the
current exam open. The runtime also updates the document language, page title,
metadata, internal links, accessibility labels, number formatting, and copied
result summaries. Arabic sets right-to-left document flow. Spatial experiment
controls retain physical left/right placement and numbered keyboard order in
every writing direction.

English source phrases and their eleven translations live in
`src/locales/<language>.js`. Only the active language catalog is loaded.
Reusable controls and safety boundaries use stable IDs from
`src/i18n/message-ids.js`; call `m(id)` for that copy. Existing experiment
prose remains source-keyed and migrates when it is changed. Add every new source
phrase with the same placeholders in every language and translate dynamic text
explicitly where it is rendered. Route-specific privacy and journal copy for
the added locales lives in `src/locales/supplemental/`.
`tests/i18n.test.js` rejects missing stable IDs, missing values, duplicate
English source phrases, placeholder drift, and accidental safety-copy fallback.
Browser tests cover locale routing, regional detection, right-to-left behavior,
persistence, accessibility, and mobile overflow.

Run `npm run locales:check` for a compact completion report across all catalogs,
or `npm run locales:check -- --details` to list every source-equal string. The
same audit runs inside the release gate and also catches missing or duplicate
keys, empty values, missing stable IDs, and placeholder drift.

## Static discovery and crawler policy

`npm run build` creates 109 localized static entry pages: the root, all twelve
galleries, all 60 exam routes, all twelve About routes, all twelve journal
routes, and all twelve privacy routes. Each route contains useful content
without JavaScript, a unique title and description, a canonical URL, reciprocal
`hreflang` links, truthful structured data, research links, and real internal
links. The build also
creates an exact sitemap, `robots.txt`, an optional `llms.txt` discovery
summary, and a script-free `404.html` so unknown paths don't become indexable
soft-404 responses.

The default policy allows conventional search and user-directed retrieval
crawlers. It disallows `GPTBot` and `ClaudeBot`, which are associated with model
training rather than a user's immediate request. Review that deliberate product
choice whenever the crawler policy changes; `llms.txt` is a convenience, not an
access-control mechanism. `src/crawler-policy.js` records the provider purpose,
official guidance, review date, and next review deadline. Static verification
fails after that deadline until the policy is reviewed. Preview deployments
send `X-Robots-Tag: noindex`.

Static pages are generated from `src/exams/registry.js`, the locale catalogs,
the structured About copy, and the privacy copy. Don't hand-edit files under
`dist/`.

## Develop and test

Run the deterministic colour, timing, adaptive hearing, calibrated acuity, and
session-engine tests:

```sh
npm test
```

Check the JavaScript and CSS source with Biome:

```sh
npm run lint
```

Check the strict typed-JavaScript contracts and coverage ratchet:

```sh
npm run typecheck
```

The ratchet automatically includes domain models, experiment views,
localization helpers, and locale catalogs; it also rejects unchecked additions
and type-suppression escapes in those boundaries. Experiment controllers expose
checked public declarations and are converted internally one stable transition
at a time. See ADR 0005 for the evidence that would justify moving individual
modules to TypeScript.

Run unit tests with enforced coverage for shared storage and lifecycle code:

```sh
npm run test:coverage
```

Build the production bundle:

```sh
npm run build
```

Verify the generated routes, metadata, crawler files, security policy, and
bundle budgets:

```sh
npm run test:static
```

Run the browser, accessibility, and responsive checks:

```sh
npm run test:e2e
```

The complete suite runs in desktop and mobile Chromium. Focused gallery,
route-CSS, setup, and first-interaction journeys also run in Firefox and WebKit.

Run every gate:

```sh
npm run check
```

## Deploy

Every push to `main` runs the complete lint, locale, unit, build, browser,
responsive, accessibility, static-output, and bundle-budget gate. The deploy
job builds and verifies one `dist/` directory, then uploads that same directory
directly to Cloudflare Pages. The verification step has a ten-minute ceiling;
if the suite reaches it, shard Playwright instead of raising the ceiling.

Same-repository pull requests run that gate and publish the already verified
`dist/` directory to a stable `pr-<number>.sense6.pages.dev` branch preview. CI
then smoke-tests the real deployment. Cloudflare and `_headers` mark previews
`noindex`, and both the client and Pages Function accept metrics only on
`https://sense6.net`. Fork pull requests verify without deployment credentials
or a preview.

The initial route budget is at most 110 kB of raw JavaScript. Entry CSS is
limited to 125 kB raw, every route stylesheet to 40 kB raw, and entry plus the
largest route stylesheet to 150 kB raw. The gallery and Tetracromia have their
own route chunks.
`tests/static-output.build.js` discovers all generated route stylesheets and
fails when a bundle crosses those ceilings. The budgets intentionally use
uncompressed sizes so regressions stay visible independently of transfer
compression.

The production site is available at
[`sense6.net`](https://sense6.net). Cloudflare Pages terminates TLS and serves
the files from its edge; the site has no application server or origin in the
personal Kubernetes cluster. The old
[`tetracromia.brontolotto.observer`](https://tetracromia.brontolotto.observer)
hostname and `www.sense6.net` redirect to the canonical domain through
Cloudflare Single Redirect rules. Pages `_redirects` files cannot match source
hostnames, so keep domain-level redirects in the corresponding Cloudflare zone.

The deployment workflow requires the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repository secrets. Scope the token to Cloudflare Pages
edits for the account that owns `sense6.net`.

The Pages project also requires a D1 binding named `ANALYTICS_DB`. Apply
`migrations/0001_daily_metrics.sql` to that database before enabling the
binding. Keep metric reads private in the Cloudflare dashboard or Wrangler;
don't add a public read endpoint.

Add the zone's single rate-limiting rule for production before enabling the
counter. Match `POST` requests whose path equals `/api/metric`, allow 10 requests
per 10 seconds per source IP, and block excess requests for 10 seconds. This is
the free-plan minimum window and leaves ample room for a page load, test start,
completion, and report download. Cloudflare uses the request IP transiently for
this edge control; Sense6 doesn't copy or store it.

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

[Zeno](https://personal.brontolotto.observer)

## License

[MIT](LICENSE)
