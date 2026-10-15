# Sense6 agent guide

Sense6 is a privacy-first collection of browser perception experiments. It is
not a medical, diagnostic, certified, or clinically validated product. Keep that
boundary explicit in code, result copy, metadata, and documentation.

## Start here

- `README.md`: product behavior, privacy, localization, and development.
- `docs/README.md`: current guides, decisions, runbooks, and research lifecycle.
- `docs/architecture.md`: runtime boundaries and source-of-truth map.
- `docs/adding-an-experiment.md`: extension contract.
- `CONTRIBUTING.md`: portable setup, checks, and contribution workflow.
- `SECURITY.md`: private reporting and sensitive-data handling.
- `docs/public-repository-readiness.md`: public-maintenance controls and file-retention decisions.

## Rules

- Session answers and measurements stay on the user's device. Server metrics
  remain anonymous approved daily counts.
- Do not turn exploratory observations into diagnoses, norms, prescriptions, or
  a composite score.
- Keep protocols, localization, generated static pages, journal passports, and
  tests synchronized through their existing generators and gates.
- Run `git status --short --branch` before editing and before handoff.

## Responsive layout and coding agents

When changing the generated gallery, Arabic RTL presentation or Learn pages,
read the owned [Bronto Layout contracts](test/layout/README.md) and the
supplemental [field-trial workflow](.github/workflows/layout-field-trial.yml).
The workflow builds this exact source, serves public static routes on loopback,
and checks reviewed selector, inline-start and containment relationships at
sampled widths. It adds a reversible 12px negative control to verify that a
semantic defect is detected even when the generic overflow audit sees none.
This is **supplemental** and does not replace existing browser, visual,
Lighthouse, HTML, accessibility or release gates.

An agent investigating a layout failure should report the contract ID, actual
viewport and locale (`en` versus `ar`), measured CSS-pixel deviation and any
skipped state. Confirm the intended design before editing CSS. Never approve
inferred suggestions automatically, change tolerances just to obtain green CI,
turn uncertain geometry into a medical interpretation, or upload screenshots,
answers or personal measurements. Checks at sampled widths do not prove
correctness between them or inside inaccessible frames.

## Checks

Use focused tests while iterating. Before handoff, run:

```sh
npm run check:core
npm run docs:check
```

Run the browser matrix when the change affects browser behavior.
In the Bronto workspace, also run `repo-instruction-audit --repo .` after
changing agent instructions or documentation routing. This optional workspace
helper is not required for a standalone clone.

Repository visibility, Git history rewrites, and deployment credentials are
maintainer decisions. Never commit local `.env` or `.dev.vars` files, private
journal exports, participant notes, or scanner reports containing secrets.
