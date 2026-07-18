<!-- vale off -->
# Tetracromia
<!-- vale on -->
<!-- vale Vale.Spelling = NO -->

A research-grounded, browser-based color discrimination lab.

## Background

Tetracromia measures how consistently you distinguish colors that a particular
screen can reproduce. It combines three short tasks:

- an adaptive odd-color threshold task;
- a noisy-field discrimination task; and
- hue ordering inspired by the Farnsworth–Munsell method.

The site does not claim to diagnose tetrachromacy or color-vision deficiency.
An ordinary RGB display cannot produce the independent spectral stimuli needed
to test functional tetrachromacy. The result describes one run under one set of
display, lighting, and observer conditions.

The implementation uses OKLCH to generate perceptually spaced stimuli, maps
them into the sRGB gamut by reducing chroma, and applies a two-correct-down,
one-error-up adaptive staircase. The score is useful for comparing your own
runs under similar conditions. It is not a population percentile.

Research and standards that informed the product:

- [Jordan et al., *The dimensionality of color vision in carriers of anomalous trichromacy*](https://doi.org/10.1167/10.8.12)
- [X-Rite, Farnsworth–Munsell 100 Hue Test](https://www.xrite.com/visual-assessment-tools/fm-100-hue-test)
- [Cambridge Colour Test reproducibility study](https://hira.hope.ac.uk/id/eprint/3007/)
- [W3C CSS Color 4: OKLab and OKLCH](https://www.w3.org/TR/css-color-4/#ok-lab)
- [Cleveland Clinic, tetrachromacy and the limits of online tests](https://my.clevelandclinic.org/health/articles/tetrachromacy)

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
