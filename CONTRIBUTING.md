# Contributing to Sense6
<!-- vale Vale.Spelling = NO -->

Sense6 welcomes focused fixes, documentation improvements, accessibility work,
reviewed translations, and reproducible reports. Read the
[README](README.md) for the product boundary and the
[architecture](docs/architecture.md) for the source map.

## Choose a useful change

Describe the problem and the behavior you expect before proposing a broad
redesign. The [roadmap](docs/roadmap.md) identifies current priorities;
[product readiness](docs/product-readiness.md) separates open questions from
evidence already gathered.

Preserve these contracts in every change:

- Answers, measurements, setup details, and journal entries stay on the device.
  Product metrics remain allowlisted daily counts.
- Results stay exploratory and device-relative. Do not add diagnoses,
  population norms, medical claims, or a composite score.
- A protocol change creates a new method or scope identity. Repeated runs from
  incompatible methods must not become comparable.
- Research citations and automated checks do not validate the assembled
  experiment. Record review provenance accurately.

For a new experiment, follow the
[extension checklist](docs/adding-an-experiment.md). Prefer a small change
inside the owning experiment to a shared abstraction without multiple real
consumers.

## Set up a checkout

Use Node.js 22.19 or later and npm; Node.js 24 matches the CI runtime and
`.nvmrc`. The lockfile is the dependency source of truth.

```sh
npm ci
npm run dev
```

The dev server prints its URL and runs without secrets or Cloudflare access.
It does not serve the Pages Function at `/api/metric`; failed local metric
requests are non-blocking. Endpoint tests call the handler with local fixtures,
and migration tests use Node's in-memory SQLite implementation.

For browser tests:

```sh
npx playwright install chromium firefox webkit
```

On Linux, Playwright also needs system libraries. Install browsers and those
libraries together on a development machine that permits package installation:

```sh
npx playwright install --with-deps chromium firefox webkit
```

HTML validation uses `vnu-jar`, which needs Java. Its npm installation provides
a local Java runtime if none is available. If you disable installation scripts,
provide the required Java runtime before running `npm run test:html`.

Stop a manually started Vite server before a browser suite that uses the same
port. The default matrix uses ports 4173 and 4176, site audits use 4174, and the
local deployed journey uses 4175. Their `PLAYWRIGHT_*_PORT` overrides are
defined in the corresponding configuration files.

## Test the behavior you change

Use a focused unit or browser test while iterating, for example:

```sh
node --test tests/metric-function.test.js
npx playwright test tests/cross-browser.spec.js --project=chromium-smoke
```

The main commands are:

| Command | Checks |
| --- | --- |
| `npm test` | Unit tests, including method schedules, storage, metrics, and workflow contracts |
| `npm run check:core` | Lint, typed JavaScript, interface and Learn catalogs, docs, UI contracts, shared-module coverage, build, and static output |
| `npm run test:pr-smoke` | Named representative journeys across desktop/mobile Chromium and the artifact compatibility projects |
| `npm run test:e2e` | The complete configured browser matrix |
| `npm run test:deployed:local` | Fresh build, enforced response-header contract, and production-bundle hydration journey on localhost |
| `npm run check:release` | Core and full browser checks, generated HTML, internal links, and site audits |

Run `npm run check:core` before handoff. Run the relevant browser journeys
when changing interactive behavior, routing, presentation, or generated HTML.
For a full local release check, use `npm run check:release`. Visual regression
and Lighthouse are separate mandatory CI jobs; a local release check does not
replace them.

### Know what each browser project proves

The `chromium` and `mobile` projects run the full behavioral suite on the
Vite dev server. Their accelerated experiment fixtures require both development
mode and localhost. Production schedules and stopping rules are separate
unit-test invariants.

The `chromium-smoke`, `firefox`, and `webkit` projects run selected critical
journeys against generated `dist/` files with the production response headers.
They cover static-page hydration, a full Screen Colour Lab run, and
display invalidation. They do not run every accelerated journey in every engine.

`npm run test:deployed:local` checks the generated bundle through the dedicated
artifact server. An ordinary Vite preview is useful for inspection but is not
evidence that Cloudflare's response headers are enforced.

### Review visible changes

CI captures the base revision and candidate on the same pinned browser image.
Intentional differences require a new or revised justification in
`audits/visual-baseline-approvals.txt`. The report must retain the base,
candidate, and pixel diff so the change can be reviewed. An inherited approval
cannot exempt a later change.

Do not commit generated browser reports or baseline screenshots. Keep a
reproduction route and viewport in the pull request, and inspect the affected
desktop, mobile, keyboard, and right-to-left paths when applicable.

Playwright upgrades must update the locked package and every pinned CI image
together. See the [release runbook](docs/runbooks/cloudflare-pages-release.md#keep-playwright-dependencies-and-ci-images-in-lockstep).

### Optional assertion review

`scripts/mutation-check.mjs` can help investigate weak assertions in a shared
module:

```sh
node scripts/mutation-check.mjs --list src/lib/hearing.js
node scripts/mutation-check.mjs --test 'node --test tests/hearing.test.js' src/lib/hearing.js
```

It edits its target in place, restores it after each sweep, and refuses dirty
targets. Use an isolated checkout without concurrent readers or writers.
Surviving textual mutations need investigation: they may expose a missing
assertion or an equivalent change. The tool reports survivors without failing
the process and is not a release gate.

## Edit sources and generated content together

| Change | Edit | Regenerate or verify |
| --- | --- | --- |
| Shared interface copy | Source modules under `src/locales/` and stable IDs in `src/i18n/message-ids.js` | `npm run locales:generate`, then `npm run locales:check` |
| Experiment-specific prose | Catalogs in `src/locales/` and owning views | All locales and placeholders must agree |
| Research guides | `src/learn-content.json`, Learn UI copy, and complete reviewed catalogs | Follow [Learn locale publication](src/learn-locales/README.md); run `npm run learn:check` |
| Routes, metadata, and public copy | Shared route/experiment registries and structured source copy | `npm run build`, then `npm run test:static` |
| Social cards | `scripts/generate-social-images.mjs` | `npm run social:images`; commit its SVG and PNG output |
| Current documentation | The guide that owns the topic and `docs/README.md` routing when needed | `npm run docs:check` |

Generated locale JSON and public social cards are intentional tracked assets.
`dist/`, dependencies, coverage, Playwright output, and local study records
are generated or private working material and must remain untracked.

New shared controls and safety copy use stable message IDs and `m(id)`.
Existing experiment prose may remain source-keyed until edited. Translate
accessible names, announcements, metadata, copied results, and error states
alongside visible prose. Use `npm run locales:check -- --details` to inspect
catalog drift.

Learn translations have a separate publication manifest and source-hash
contract. A structurally complete translation is not proof of human language
review. Keep incomplete or private drafts outside `src/` and record the actual
reviewer and review method.

## Prepare a pull request

Explain the problem, resulting behavior, relevant test evidence, and any
remaining limits. Include reproduction steps for bugs and the affected route
and viewport for visual changes. Update the changelog for user-visible behavior
and the guide that owns any changed contract.

Use synthetic fixtures in public reports and tests. Do not attach private
journal exports, participant data, credentials, or account screenshots.
Security-sensitive reports should use the process in [SECURITY.md](SECURITY.md).

Same-repository pull requests run representative browser journeys and the
non-browser, visual, Lighthouse, and artifact checks. The checked-in workflow
routes verification only for same-repository pull requests. Contributors can
run the local commands above; maintainers must review external changes and
arrange trusted verification before integration. A condition in a
pull-request-controlled workflow is not sufficient isolation for a self-hosted
runner. The [public-repository readiness review](docs/public-repository-readiness.md)
records the external runner-access prerequisites. Skipped fork CI is not a
passing release gate.

Publishing the site is a maintainer operation. A push to `main` runs the
complete configured browser matrix and the production release checks before
deploying to Cloudflare Pages. Pull-request preview publication remains
disabled. The [release runbook](docs/runbooks/cloudflare-pages-release.md)
owns deployment, migration, verification, and rollback instructions.
