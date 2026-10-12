# Cloudflare Pages release
<!-- vale Vale.Spelling = NO -->

Lifecycle: current

Use this runbook when a Sense6 change affects production deployment, the
`ANALYTICS_DB` binding, or the D1 migration set. Pull-request preview
publication is currently disabled.

## Symptom

- A release adds or changes a runtime metric pair.
- A production deployment doesn't match its source commit.
- The production smoke test reports missing security headers, an open metric
  read path, or `noindex` on the canonical site.
- The production smoke test reports that the edge never served the built assets.
- The deployed-browser journey reports a hydration, content security policy,
  asset, console, setup, or 404 failure.
- The Pages Function reports that `ANALYTICS_DB` is unavailable or rejects an
  otherwise allowlisted metric.

## Preconditions

- The pull request is current with `main` and `npm run check:release` passes.
- CI's release job produces `dist/`, `dist.sha256`, and
  `dist/build-meta.json` from one build after the browser matrix passes. It
  stamps the checksum immediately after that build and re-checks it immediately
  before the upload, so every audit in between runs on the bytes that ship.
- The existing production Cloudflare credentials are available to the `main`
  deployment workflow; never print their values.
- The Pages project is `sense6`, the production branch is `main`, and the D1
  binding is named `ANALYTICS_DB`.
- A database name or identifier has been confirmed in the Cloudflare dashboard
  before running Wrangler. Don't infer it from the binding name.
- A production preflight has recorded live state, drift, blast radius,
  rollback, and operator approval before applying a migration or merging to
  `main`.
- Every workflow job that runs on `arc-vps-sense6`, the self-hosted runner in the
  operator's cluster, carries a head-repository guard, so a fork pull request
  cannot install and build its own code there. Confirm this before making the
  repository public — the remedy for the missing branch protection — and whenever
  a job is added. `tests/audit-wiring.test.js` resolves each job's condition
  against a fork pull request and fails if any of them would start.

## Steps

1. Inspect every numbered file under `migrations/` and confirm that the pull
   request's migration test runs the complete ordered set while preserving
   existing rows.
2. List remote D1 migrations without changing the database:

   ```sh
   npx wrangler d1 migrations list <database-name> --remote
   ```

3. If production is behind and the preflight is approved, apply the complete
   pending set before merging the runtime allowlist:

   ```sh
   npx wrangler d1 migrations apply <database-name> --remote
   ```

4. Confirm in the Pages project settings that `ANALYTICS_DB` points to the
   intended production database. Confirm the zone rate-limit rule still matches
   only `POST /api/metric` with the documented 10 requests per 10 seconds and a
   10-second block.
5. Push the pull-request branch. Wait for the reusable browser, visual,
   Lighthouse, and release jobs. The release job builds once, stamps
   `dist.sha256` over that build, runs the core, HTML, link, browser-journey,
   and production-site audits against it, and re-checks the checksum as its
   last act before publication — without deployment credentials on a pull
   request.

   Read the checksum for what it attests: the bytes that were audited are the
   bytes that were uploaded. It is not evidence of the artifact's provenance, it
   says nothing about what Cloudflare serves after the upload, and it would
   attest nothing at all if the stamp and the re-check were adjacent.
   `tests/audit-wiring.test.js` pins that ordering; don't satisfy it by moving
   the audits out of the window.
6. Don't enable preview publication until an operator creates and verifies an
   isolated, protected preview environment. The publication workflow must be
   owned by the default branch, publish only the verified artifact without
   checking out or executing pull-request-controlled code, and smoke-test the
   resulting `noindex` URL. Repository code doesn't prove or create this
   external prerequisite.
7. After approval, merge to `main`. The production workflow repeats the
   browser-first release contract and runs:

   ```sh
   node scripts/smoke-production.mjs https://sense6.net <40-character-commit>
   ```

   The probe reads public pages and sends `GET /api/metric`; it never writes a
   metric. Before any other check it waits for the edge to serve every hashed
   file of the new build — each pre-rendered page referencing its own chunks,
   plus the chunks no page names — on three consecutive sweeps. A wait that
   never settles fails the step and names the first file the edge is missing;
   that is Cloudflare propagation, not a site regression. Waiting on the entry
   chunk alone used to let a route-only change past instantly, because a route
   chunk's hash changes while the entry chunk's does not.
8. Let the trusted production workflow run the deployed JavaScript journey.
   The journey intercepts and blocks `POST /api/metric` before it reaches the
   network. It verifies hydration, experiment setup, content security policy
   and asset loading, browser errors, and a real 404. A retry-only success fails
   the job, and the workflow retains the browser report, trace, screenshot, and
   video.

   To exercise the same generated-bundle path without contacting production,
   run:

   ```sh
   npm run test:deployed:local
   ```

   Use this deterministic path for branch verification when needed.
   Pull-request workflows do not receive a production publication path or run
   branch code against a production credential.


## Maintain scientific-reference link integrity

The weekly Lychee external-link check retains strict HTTP failures for all
references except **two exact publisher endpoints** that return HTTP 403 to
automated link-checking clients: the ISO 8596:2017 catalogue URL
`https://www.iso.org/standard/69042.html` and the Jordan et al. (2010)
Journal of Vision DOI `https://doi.org/10.1167/10.8.12`. Both citations stay
in the published source. The DOI is also traceable through PubMed record
PMID 20884587.

The two URL regexes are fully anchored; no blanket HTTP 403 exception is
allowed. The workflow-policy test ensures that similar or modified URLs remain
checked and that new citations are **not** automatically exempt. These exact
URLs are not automatically verified by the scheduled job, so review them
periodically in an authoritative bibliography or through human-accessible
publisher pages. A missing or changed publication requires a real citation
correction rather than a wider exclusion.

## Keep Playwright dependencies and CI images in lockstep

The browser, visual, Lighthouse and release jobs run inside digest-pinned
`mcr.microsoft.com/playwright:vX.Y.Z-noble` images. The installed
`@playwright/test` and `playwright-core` versions in `package-lock.json`
**must be exactly X.Y.Z**. A newer npm package with an older image fails
before it launches Chromium, Firefox or WebKit; it does not indicate a broken
Sense6 instrument.

Treat Playwright as a dedicated dependency upgrade, not part of a general npm
Dependabot bundle:

1. Update the npm lockfile and the image *tag and verified manifest digest* in
   every `.github/workflows/*.yml` job together. Resolve the digest from the
   official Microsoft registry (the `Docker-Content-Digest` response header for
   `https://mcr.microsoft.com/v2/playwright/manifests/vX.Y.Z-noble` with an
   OCI image-index `Accept` header). Do not guess or omit the digest.
2. Run `node --test tests/audit-wiring.test.js` followed by `npm run check:core`.
   The audit rejects a mismatched version, a missing digest, or inconsistent
   browser images. It also checks that every artifact-upload Action use retains
   a consistent full commit SHA and version annotation without hardcoding a
   particular patch release.
3. Run the standard browser, visual and Lighthouse CI gates on the same PR.
   Do not work around the mismatch by skipping browsers, weakening coverage,
   or pulling an unpinned runtime image.

The npm Dependabot configuration excludes `@playwright/test` from the general
non-major group so routine unrelated upgrades remain testable. A standalone
Playwright PR may initially fail the explicit image-alignment assertion until
its matching image update is prepared; that failure is intentional.

## Maintain the Lighthouse release gate

`npm run audit:lighthouse` runs the official Lighthouse package against the
locally built Sense6 preview on `127.0.0.1`, not arbitrary public sites. It
runs every route in `SEARCH_REPRESENTATIVE_ROUTES` for each pull request and
all routes in `SEARCH_ROUTES` for the scheduled full-site sweep. No crawler,
unindexed utility page, or `llms.txt`-driven URL is silently added to its scope.

The pinned Playwright Chromium image supplies the browser executable. Its
mobile screen emulation, user agent, network throttling and **1× CPU slowdown**
match the previously deployed Unlighthouse 0.19.1 profile; using unmodified
Lighthouse mobile defaults raises the CPU slowdown to 4× and makes scores
incomparable. A deliberate profile change needs its own comparative evidence.

Before replacing the existing Lighthouse provider, run the entire route set on
the **pinned CI runner** from the candidate branch using the Site audit workflow
with the `lighthouse_only` manual input enabled. That input starts only the
complete Lighthouse sweep, not its separate external-link, route-integrity or
passive-security jobs. Regular weekly scheduled runs and manual runs without
the input retain all four audit jobs. The current PR and production release
gates remain unchanged and mandatory.

The scheduled full sweep starts a fresh Chrome process every **16 routes** to
bound browser-session resource accumulation. It still measures each of the
157 canonical pages exactly once and applies the same unmodified budgets.
The runner does **not** retry a slow page or ignore an anomalous score. If a
full-site budget fails, preserve its Lighthouse report and compare isolated
reproductions against nearby locale pages before changing experiment code,
throttling settings, or thresholds.

`scripts/check-lighthouse-metrics.mjs` requires one same-origin report for
every requested route. All reports must meet the existing category floors
(performance 90, accessibility 100, best-practices 100, SEO 100) and numeric
budgets (CLS at most 0.1, LCP at most 2500 ms, TBT at most 200 ms). Missing,
repeated, cross-origin, or incomplete reports fail the gate. The visual,
browser, Lighthouse and release jobs remain mandatory for publishing.

The current direct runner replaces an older Unlighthouse dependency chain
containing unresolved *development-only* advisories. It doesn't change the
browser experiments, the users' local results, or anonymous product metrics.

## Verify

- `https://sense6.net/build-meta.json` reports the merged 40-character commit.
- `/en/`, `/en/about/`, and `/en/udito/` return substantive HTML without
  `X-Robots-Tag: noindex`.
- Production returns the checked security-header contract, including HSTS,
  frame denial, no-referrer, and cross-origin isolation headers.
- `GET https://sense6.net/api/metric` with same-origin headers returns `405`.
- The deployed Chromium journey hydrates Tetracromia, reaches its first measured
  choice without a content security policy, console, or asset failure, and
  receives HTTP `404` plus `noindex` from its missing route.
- The Pages deployment identifies the expected commit, and the release job's
  checksum re-check passed after every audit and immediately before the upload.
- D1 contains the pre-existing aggregate rows after migration. Inspect counts
  privately; don't add or use a public read endpoint.

## Rollback

1. In Cloudflare Pages, select the previous known-good verified production
   deployment and promote or roll it back.
2. Run the production smoke script with that deployment's commit and confirm
   the public contract again.
3. Don't reverse a D1 migration by improvising SQL. Current migrations are
   forward-only and must preserve compatibility with the previous application.
   If a schema correction is required, prepare and test a new numbered forward
   migration before applying it under a fresh production preflight.

## Escalation

Stop the release and ask the operator when the database identity, binding,
remote migration state, artifact commit, checksum, or rollback target is
uncertain. Preserve the failed workflow and deployment links. Don't merge a
runtime metric change while production D1 is behind, and don't bypass the
verified-artifact workflow with an ad hoc Pages upload.
