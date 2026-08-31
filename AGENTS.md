# Sense6 agent guide

Sense6 is a privacy-first collection of browser perception experiments. It is
not a medical, diagnostic, certified, or clinically validated product. Keep that
boundary explicit in code, result copy, metadata, and documentation.

## Start here

- `README.md`: product behavior, privacy, localization, and development.
- `docs/README.md`: current guides, decisions, runbooks, and research lifecycle.
- `docs/architecture.md`: runtime boundaries and source-of-truth map.
- `docs/adding-an-experiment.md`: extension contract.

## Rules

- Session answers and measurements stay on the user's device. Server metrics
  remain anonymous approved daily counts.
- Do not turn exploratory observations into diagnoses, norms, prescriptions, or
  a composite score.
- Keep protocols, localization, generated static pages, journal passports, and
  tests synchronized through their existing generators and gates.
- Run `git status --short --branch` before editing and before handoff.

## Checks

Use focused tests while iterating. Before handoff, run:

```sh
npm run check:core
npm run docs:check
```

Run the browser matrix only when the change needs it. Run
`repo-instruction-audit --repo .` after changing agent instructions or
documentation routing.
