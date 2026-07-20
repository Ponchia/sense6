# 0005. Continue with incremental typed JavaScript
<!-- vale Vale.Spelling = NO -->

Status: accepted

## Context

Sense6 is a static, dependency-light browser app. Its experiment
controllers are large because they coordinate several screens, device APIs, and
measurement phases. The numerical models, persistence, lifecycle, and journal
logic already live in smaller modules with deterministic tests.

The repository uses JavaScript modules, JSDoc contracts, and TypeScript's
`checkJs` mode. Shared modules pass strict checks, while older controllers are
not yet in that program. A complete TypeScript conversion would change nearly
every experiment and locale at once without changing the runtime. A framework
migration would also replace working routing, static generation, and lifecycle
code without solving measurement-specific complexity.

## Decision

- Keep vanilla ECMAScript modules, Vite, and JSDoc-based strict checking.
- Require new shared contracts, domain modules, and reusable view helpers to
  pass `npm run typecheck`.
- Expand `jsconfig.json` when a module has a stable interface or changes
  substantially. Convert one dependency boundary at a time.
- Keep experiment controllers as orchestration modules. Move reusable markup,
  domain algorithms, persistence, and cross-experiment policy out of them.
- Don't introduce a framework solely to reduce file length.
- Reconsider TypeScript when multiple contributors regularly change shared
  interfaces, JSDoc can no longer express required invariants, or type defects
  repeatedly escape the current checks.

## Consequences

Changes remain reviewable and don't create a long-lived mixed-language
migration branch. Runtime output and deployment stay unchanged.

The project still has two typing levels during the transition. Reviewers must
keep `jsconfig.json` honest and must not treat unchecked controllers as typed.
Some JSDoc declarations are more verbose than TypeScript syntax.

This decision doesn't forbid TypeScript. It defines evidence that would make a
conversion worthwhile and keeps that future migration incremental.
