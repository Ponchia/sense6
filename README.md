<!-- vale off -->
# Sense6
<!-- vale on -->
<!-- vale Vale.Spelling = NO -->

Browser perception experiments for curiosity: explore colour, response timing,
listening, and visual sharpness, then keep and compare runs in a private local
journal. No account is required.

**[Try Sense6](https://sense6.net/) · [Read the research guides](https://sense6.net/en/learn/) · [Contributor guide](CONTRIBUTING.md)**

Sense6 is an experimental personal project. Results describe one task on one
device under one setup. The software is not clinically validated, certified, or
suitable for medical or occupational decisions, and becoming a medical product
is outside its purpose.

## Explore the experiments

| Experiment | What you explore | What the result describes |
| --- | --- | --- |
| [Screen Colour Lab / Tetracromia](https://sense6.net/en/tetracromia/) | Tile choices, dot-field choices, and hue ordering | Three short display-relative observations; no tetrachromacy inference or overall ability score |
| [Daltonia](https://sense6.net/en/color-blindness/) | Adaptive colour-direction tasks with task controls | Levels reached on that display; no colour-vision classification |
| [Riflessi](https://sense6.net/en/riflessi/) | Simple response, two-choice response, and sustained response | Separate timing, accuracy, and within-run observations; device delays remain uncalibrated |
| [Udito](https://sense6.net/en/udito/) | Listening confidence, an upper run boundary, and pitch steps | Device-relative listening observations; no clinical hearing threshold or hearing age |
| [Acutezza](https://sense6.net/en/acutezza/) | Per-eye angular detail and a nominal low-contrast condition | Setup-dependent estimates and model intervals; no prescription or clinical acuity claim |

For a short first visit, [Riflessi's signal task](https://sense6.net/en/riflessi/?scope=signal)
opens its normal preparation flow with the shortest scope selected. It does not
start a timed run automatically.

The [About page](https://sense6.net/en/about/) explains authorship, methods,
privacy, and interpretation limits. The Learn guides distinguish research that
informs a task from evidence that would validate its exact implementation.

## What is included

- Five interactive experiments with explicit setup, interruption handling,
  separate result measures, and links to their research explanations.
- A [local journal](https://sense6.net/en/journal/) with up to 100 runs,
  protocol-aware comparison, individual or complete deletion, and validated
  JSON export and import.
- English, Italian, Spanish, German, French, European Portuguese, Brazilian
  Portuguese, Arabic, Japanese, Korean, Hindi, and Simplified Chinese.
- Localized HTML entry pages with useful content before JavaScript runs;
  the interactive experiment loads when its route is opened.

Journal comparisons retain the method, scope, and setup conditions of each
run. Incompatible protocols are kept separate, and Sense6 never combines the
experiments into a suite-wide score. Browser storage can be cleared or lost;
export any runs you want to keep.

The project is in active development. Human comprehension review and editorial
review of the AI-assisted translations remain explicit work in the
[product-readiness plan](docs/product-readiness.md). Automated tests verify
software behavior; they do not establish scientific validity, native language
fluency, or reliable measurements across consumer devices.

## Run locally

Use **Node.js 22.19 or later**. CI uses Node.js 24.

```sh
git clone https://github.com/Ponchia/sense6.git
cd sense6
npm ci
npm run dev
```

Open the local URL printed by Vite. Local development and tests need no account,
Cloudflare credentials, or production database. The app's aggregate-metrics
endpoint is a separate Pages Function; Vite does not run it, and unavailable
metrics do not block experiments.

To inspect the generated site:

```sh
npm run build
npm run preview
```

Vite preview serves the generated files for local inspection. The automated
artifact journey additionally checks the production security headers and
hydration behavior.

## Verify a change

```sh
npm run check:core
```

This runs source, type, localization, documentation, UI-contract, coverage,
build, and static-output checks. For browser changes, install the test browsers
and run the representative journeys:

```sh
npx playwright install chromium firefox webkit
npm run test:pr-smoke
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for Linux browser dependencies, focused
tests, the full release checks, visual review, and generated-file ownership.
Production deployment also requires the separate CI visual and Lighthouse
gates.

## Privacy and data

Session answers, measurements, setup details, and journal entries stay in the
browser. A journal export leaves it only when you choose to save or share the
file. Sense6 uses local storage for preferences and results, not visitor
identification.

On the canonical production site, an allowlisted event and experiment name can
increment an anonymous daily counter. The database contains only `day`,
`test`, `metric`, and `count`. These totals do not identify unique people or
link events into sessions. The app does not send results, answers, locale,
identifiers, fingerprints, or exact event timestamps with those counters.

Cloudflare processes ordinary requests to deliver and protect the site; that
hosting boundary is separate from the data Sense6 stores. Read the
[privacy page](https://sense6.net/en/privacy/) and
[architecture](docs/architecture.md#data-and-privacy) for the full contract.

## Find your way around

| Location | Purpose |
| --- | --- |
| `src/exams/` | Experiment controllers, contracts, frozen protocols, evidence sources, result schemas, and views |
| `src/lib/` | Domain models, lifecycle, persistence, and journal comparison |
| `src/locales/`, `src/learn-locales/` | Interface catalogs and published research-guide translations |
| `functions/`, `migrations/` | Aggregate-metrics endpoint and forward database migrations |
| `scripts/` | Generators and verification tools |
| `tests/`, `audits/` | Unit, browser, static-output, visual, and site checks |
| [`docs/`](docs/README.md) | Current guides, release runbook, decisions, and archived research |

The runtime uses vanilla JavaScript modules, Vite, and
[Bronto UI](https://github.com/Ponchia/bronto-ui). Experiment geometry and
measurement models belong to Sense6.

Start with the [architecture](docs/architecture.md) for a code change or
[adding an experiment](docs/adding-an-experiment.md) for a new task.
The [roadmap](docs/roadmap.md) records current priorities and bounded technical
debt; the [changelog](CHANGELOG.md) records behavior changes. Production
operations belong in the [Cloudflare Pages runbook](docs/runbooks/cloudflare-pages-release.md).
The [public-repository readiness review](docs/public-repository-readiness.md)
tracks the remaining conditions for changing repository visibility.

## Contributing

Useful contributions include reproducible bug reports, accessibility fixes,
clearer instructions, reviewed translations, and focused improvements to the
measurement and persistence code. Follow the
[contributor guide](CONTRIBUTING.md) before changing a protocol or data boundary.

## Maintainer and license

Maintained by [Zeno Trevisan](https://brontolotto.observer/). Optional support is available on
[Ko-fi](https://ko-fi.com/ponchia); the experiments remain free to use.

The source code is licensed under the [MIT license](LICENSE). Distributed UI
code and fonts retain their own [third-party notices](THIRD_PARTY_NOTICES.md).
