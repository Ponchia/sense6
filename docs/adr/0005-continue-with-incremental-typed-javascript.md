# 0005. Continue with incremental typed JavaScript
<!-- vale Vale.Spelling = NO -->

Status: accepted

Lifecycle: current

## Context

Sense6 is a static, dependency-light browser app. Its experiment
controllers are large because they coordinate several screens, device APIs, and
measurement phases. The numerical models, persistence, lifecycle, and journal
logic already live in smaller modules with deterministic tests.

The repository uses JavaScript modules, JSDoc contracts, and TypeScript's
`checkJs` mode. Domain models, pure experiment views, localization catalogs,
and shared routing boundaries pass strict checks. Older controller
implementations aren't yet in that program, but colocated declaration files
define and check their lazy-loaded public `mount(context)` boundary.

A complete TypeScript conversion would change nearly every experiment at once
without changing the runtime. A framework migration would also replace working
routing, static generation, and lifecycle code without solving
measurement-specific complexity.

## Decision

- Keep vanilla ECMAScript modules, Vite, and JSDoc-based strict checking. Enable
  `noUncheckedIndexedAccess` so array, tuple, record, and regular-expression
  lookups can't silently produce an unchecked value.
- Require every domain module, locale catalog, localization helper, and reusable
  experiment view to pass `npm run typecheck`. A ratchet discovers files under
  those roots automatically so new files can't silently remain unchecked.
- Reject type-suppression comments and explicit JSDoc `any` declarations in the
  strict program. Narrow values at storage, DOM, locale, audio, and dynamic
  import boundaries.
- Represent fixed-size numerical values as tuples. Guard variable-length and
  external lookups, and fail explicitly when a missing value means the state is
  corrupt. Don't use casts only to hide an unchecked lookup.
- Give every experiment controller a checked public module declaration. Convert
  controller internals one stable state transition at a time when that
  controller changes.
- Keep experiment controllers as orchestration modules. Move reusable markup,
  domain algorithms, persistence, and cross-experiment policy out of them.
- Represent phase-specific domain state with explicit variants and runtime
  guards. Static types don't replace validation of persisted data, browser APIs,
  or transitions triggered by events.
- Don't introduce a framework solely to reduce file length.
- Reconsider `.ts` modules when multiple contributors regularly change shared
  interfaces, controller declarations drift from implementations, JSDoc
  obscures state models, or type defects repeatedly escape the current checks.
  Migrate dependency boundaries independently; don't create a suite-wide
  conversion branch.

## Consequences

Changes remain reviewable and don't create a long-lived mixed-language
migration branch. Runtime output and deployment stay unchanged.

The project still has two typing levels during the transition. The ratchet keeps
the strict roots honest, but a controller declaration proves only its public
module boundary—not the controller's internal state. Some JSDoc declarations
are more verbose than TypeScript syntax.

Runtime behavior and deployment remain unchanged. The stricter program makes a
future file-by-file TypeScript migration smaller because its domain contracts
and module seams already exist.

The compiler now exposes missing array and record values at review time. Some
valid loops require explicit tuple contracts or local guards, but those checks
also document whether absence is a fallback, a rejected action, or corrupt
state.
