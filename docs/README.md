# Sense6 documentation
<!-- vale Vale.Spelling = NO -->

Lifecycle: current

Use this page to find the current source of truth without mistaking historical
decisions or research for operating instructions.

## Current guides

- [Contributing](../CONTRIBUTING.md) covers local setup, verification,
  generated-file ownership, and pull-request expectations.
- [Security](../SECURITY.md) explains how to report security-sensitive issues.
- [Third-party notices](../THIRD_PARTY_NOTICES.md) records the runtime and font
  licenses included in each build.
- [Public-repository readiness](public-repository-readiness.md) tracks the
  review and external prerequisites for changing repository visibility.
- [Architecture](architecture.md) describes runtime boundaries, data flow,
  quality gates, pressure points, and delivery environments.
- [Adding an experiment](adding-an-experiment.md) is the extension checklist for
  contracts, methods, localization, journal data, static output, and tests.
- [Roadmap](roadmap.md) records current product boundaries and the ordered,
  bounded decomposition backlog.
- [Product readiness](product-readiness.md) provides the consented usability
  study script, translation review checklist, search-indexing baseline and
  decision criteria for further feature work.
- [Cloudflare Pages release](runbooks/cloudflare-pages-release.md) is the
  operational procedure for migrations, preview, production, and rollback.
- [Learn locale publication](../src/learn-locales/README.md) records translation
  validation, review provenance, source freshness and reciprocal SEO metadata.

The repository [README](../README.md) remains the public product and developer
entry point. The [changelog](../CHANGELOG.md) records released and unreleased
behavior.

## Decisions

Files under [`adr/`](adr/) are accepted architecture decisions. They explain
why the current design exists; later current guides supersede operational
details that have changed. Amend an accepted decision when its decision itself
changes, rather than copying its history into a new guide.

## Research archive

Files under [`research/`](research/) are frozen evidence reviews and
implementation snapshots dated in their status lines. They explain earlier
product and method decisions but aren't current release instructions or claims
of scientific validation. Current behavior comes from the architecture,
roadmap, contracts, protocols, migrations, and tests.

## Lifecycle rules

- Update current guides in the same pull request as the behavior they describe.
- Keep historical context in ADRs and research; don't present it as current
  operation.
- Add a runbook only for a repeatable operational procedure with verification
  and rollback.
- Remove or archive a document when another page becomes its source of truth;
  don't leave two current instructions for the same task.

`npm run docs:check` verifies the classified documentation set,
current-document markers, and local links. Current guides, root entry points,
and ADRs belong to the strict set in `scripts/check-docs-lifecycle.mjs`.
Research has a separate bounded archive set: useful source-backed context,
but not operational truth. Classify a new document in that checker and route
it here rather than leaving it outside the maintained set.
