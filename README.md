<!-- vale off -->
# Sensoria
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

Daltonia presents a C-shaped target with a gap at the top, right, bottom, or
left. Target and field consist of randomly sized and positioned dots drawn from
the same luminance-noise distribution. Twelve presentations for each of three
display-relative directions are randomly interleaved. Two correct responses
reduce the chromatic separation, and one error increases it. Three
high-contrast task controls check that the interaction was understood.

The three directions are derived from a fixed, D65-referenced transformation
from linear sRGB into a normalized LMS-like space. This transformation makes the
stimuli repeatable in browser color coordinates. It does not measure the
spectral output of a display, an observer's cone fundamentals, or anomalous
trichromacy. CIE cone fundamentals are spectral datasets; applying a fixed
matrix to consumer display pixels is only an approximation.

The result reports a threshold estimate, run spread, and staircase reversals for
each direction. Daltonia applies no population norms and does not label a run as
normal, protan, deutan, or tritan. The implementation has not been validated on
a diagnosed cohort or compared with an anomaloscope, CAD, Cambridge Colour
Test, or validated pseudoisochromatic plates. It is therefore an experiment, not
a screening or diagnostic test.

Research and standards that informed Daltonia:

- [CIE 2006 LMS cone fundamentals for a 2-degree field](https://doi.org/10.25039/CIE.DS.tijidesg)
- [Regan, Reffin, and Mollon, *Luminance noise and the rapid determination of discrimination ellipses in colour deficiency*](https://doi.org/10.1016/0042-6989(94)90203-8)
- [Brettel, Viénot, and Mollon, *Computerized simulation of color appearance for dichromats*](https://doi.org/10.1364/JOSAA.14.002647)
- [Machado, Oliveira, and Fernandes, *A physiologically based model for simulation of color vision deficiency*](https://doi.org/10.1109/TVCG.2009.113)
- [Rabin, Gooch, and Ivan, *Rapid quantification of color vision: the cone contrast test*](https://doi.org/10.1167/iovs.10-6283)
- [Evans et al., *Multicenter evaluation of the color vision screener test*](https://doi.org/10.1364/JOSAA.544985)
- [W3C CSS Color 4 conversion reference](https://www.w3.org/TR/css-color-4/#color-conversion-code)

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
three instruments. The site stores only the best session index in local
browser storage. It does not send session data to a server.

The interface uses [`@ponchia/ui`](https://github.com/Ponchia/bronto-ui) for its
tokens, typography, layout primitives, controls, feedback, theme behavior, and
site shell. Product-specific stimulus geometry remains local to this project.

## Develop and test

Run the deterministic color-math and session-engine tests:

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

Run all three gates:

```sh
npm run check
```

## Deploy

Every push to `main` verifies the app and publishes an immutable
Linux/AMD64 image to `ghcr.io/ponchia/tetracromia`. The workflow then pins that
commit-specific image in `Ponchia/vps-infra`. Flux deploys the image from
`deployments/tetracromia` without giving the app repository direct
Kubernetes credentials.

The production site is available at
[`tetracromia.brontolotto.observer`](https://tetracromia.brontolotto.observer).
The source repository and container stay private. Kubernetes receives the
container through a namespace-scoped GHCR pull secret managed by External
Secrets Operator and Vaultwarden.

The deployment workflow requires the `VPS_INFRA_GITOPS_SSH_KEY` repository
secret. Its public half is a write-enabled deploy key scoped to
`Ponchia/vps-infra`.

## Scientific limits

Browser color output depends on the panel, color profile, browser, brightness,
ambient light, viewing angle, and color-altering operating-system features.
Tetracromia therefore keeps the stimulus surround neutral, detects the gamut
reported by the browser, and reports thresholds as display-relative values.

Do not use this site for medical or occupational decisions. Use a validated
clinical or physical test administered under controlled conditions when the
result matters.

## Maintainer

[Ponchia](https://github.com/Ponchia)

## License

[MIT](LICENSE)
