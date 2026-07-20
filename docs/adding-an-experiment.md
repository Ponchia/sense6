# Adding a Sense6 experiment
<!-- vale Vale.Spelling = NO -->

Use this guide when you add a new interactive experiment. It's a checklist for
the current architecture, not a template for the scientific method.

## Before you code

Write down the narrow question, device limitations, setup conditions, stopping
rules, output units, uncertainty, bounds, and claims the result must not make.
Identify sources that inform the task. Research inspiration doesn't make the
implementation validated.

Decide whether the experiment has one protocol or several genuinely different
scopes. A shorter scope omits independent instruments. It doesn't silently run
fewer trials under the same result name. Freeze the method before using repeated
runs as evidence of consistency.

Choose a stable lowercase route ID. Changing it later affects URLs, local
storage, journal exports, metrics, and static discovery.

## 1. Define the service contract

Update `src/exams/contracts.js`:

- add the ID to the `ExamId` type;
- add one contract with a unique metric name;
- list setup fields whose absence or change prevents comparison;
- list fields that permit comparison with caution;
- add any caution that applies to every comparison; and
- define a numeric tolerance only when the setup value has a meaningful ratio.

`tests/contracts.test.js` requires the contract and registry to contain the
same IDs and unique metrics.

## 2. Register presentation metadata

Add one frozen entry to `src/exams/registry.js`. Include the route, public
name, localized source phrases, duration, limit, and lazy loader.
Static generation, gallery cards, route lookup, and metadata consume this
registry.

Add the experiment's canonical sources to `src/exams/sources.js`. Give every
source one honest role: `method`, `boundary`, `comparator`, or `validation`.
Use `validation` only for research on the exact frozen Sense6 implementation.
The interactive page, localized static route, and `llms.txt` consume this
ledger.

Add a frozen passport to `src/exams/protocols.js` for every selectable scope.
Record a method version, profile ID, schedule digest, stopping rule, and
interpretation boundary. Changing a method or scope must create a different
journal cohort.

Add `src/exams/<id>.d.ts` beside the controller and expose its `mount` through
the shared `ExamModule` contract in `src/exams/module-contract.d.ts`. The
registry's dynamic loader must satisfy that public boundary even while
maintainers convert the controller implementation incrementally.

Don't put journal or analytics policy in the registry. Those consumers use the
service contract.

## 3. Build and test the domain model

Put adaptive logic, schedules, randomization, calculations, and summaries in a
small module under `src/lib/`. Accept dependencies such as randomness or time
as arguments when practical. Add deterministic unit tests before connecting the
model to the browser.

Every module under `src/lib/` enters the strict typed-JavaScript program
automatically. Use JSDoc variants for phase-specific state, narrow unknown
inputs, and add runtime guards at transitions that events or stored data can
reach. Model fixed-size vectors and matrices as tuples. Handle a missing value
explicitly whenever you index a variable-length array, record, capture group,
or schedule. Don't bypass the gate with suppression comments, explicit `any`,
or a cast whose only purpose is to hide an unchecked lookup.

Use explicit bounds and quality states. Don't invent precision, population
norms, clinical labels, or a suite-wide score.

Assert the production schedule and stopping rules in unit tests. Accelerated
browser fixtures may shorten waits and trial counts only through localhost test
configuration; they aren't substitutes for production-dose invariants.

## 4. Add the controller and views

Create `src/exams/<id>.js` and export `mount(context)`. The mount must:

- create an owner with `createExamLifecycle`;
- register event handlers through its cancellation signal;
- guard navigation during active measurement periods;
- discard or pause invalid trials when visibility or setup changes;
- release timers, animation frames, audio, observers, and body classes; and
- return the lifecycle's dispose function.

Keep new state local to the mount when possible. Extract reusable domain logic
and pure view output instead of creating a generic base controller.

Use `src/exams/landing.js` for the common instrument index, numbered method,
and research trail. The experiment keeps ownership of its copy, visuals, and
sources.

## 5. Add journal recording

Create a language-neutral journal entry when the result becomes visible. Record
the exact protocol passport, service-contract setup fields, quality evidence,
separate named measurements, units, explicit uncertainty, bounds, and
machine-readable notes. Add comparison, migration, and round-trip tests. Don't
derive uncertainty from an interval unless the estimator defines it as
uncertainty.

Version any separate latest-result store and validate reads. Preserve a legacy
key only when one already exists.

## 6. Localize every surface

Add reusable controls or safety boundaries to
`src/i18n/message-ids.js` and render them with `m(id)`. Add experiment prose
to every catalog in `src/locales/` with identical placeholders. Extend the
structured About copy in `src/about.js` for all supported locales.

Run the catalog report while authoring:

```sh
npm run locales:check -- --details
```

The report shows completion per locale and names source-equal strings, missing
catalog entries, missing stable IDs, duplicate rows, empty values, and
placeholder drift. `npm run check` fails on structural catalog errors or when a
locale exceeds the current source-equal-string ceiling.

Translate accessibility names, announcements, page titles, copied summaries,
scope names, evidence-role labels, setup labels, and error states—not only
visible landing copy. Verify
right-to-left flow and narrow layouts when controls have spatial meaning.

## 7. Add route-scoped styles

Import `src/styles/<id>.css` from the experiment module. Keep shared tokens and
shell primitives global. Keep experiment visuals and phase layouts local.
Generated route CSS must remain below 40 kB raw. Move a shared rule only after
identifying at least two real consumers.

## 8. Complete static and public content

Update the README, changelog, About boundaries, research links, privacy wording
when the data boundary changes, and roadmap only when commitments change. The
static generator creates every localized route from the registry and catalogs.

## 9. Verify the extension

Run:

```sh
npm run lint
npm run typecheck
npm run locales:check
npm run test:coverage
npm run build
npm run test:static
npm run test:e2e
```

Add browser coverage for each selectable scope, the complete happy path,
pre-paint and duplicate-response protection, interruption, retry behavior,
keyboard use, pointer use, result recording, accessibility, and responsive
layouts. Keep the full behavioral matrix in Chromium and mobile Chromium. Add
one complete critical journey and one invalidation path to the focused Firefox
and WebKit suite when a new experiment depends on a browser API or route style
sheet. The ratchet discovers modules in the strict roots
automatically. Add a named runtime boundary to `jsconfig.json` and the
type-ratchet script together when it lives elsewhere.

Before merging, confirm that `npm run check` passes from a clean checkout and
that the built route stays inside the documented JavaScript and CSS ceilings.
Same-repository pull requests publish the already verified `dist/` directory to
a `noindex` Pages preview and smoke-test that real URL. Production metrics must
remain off there.
