# Cloudflare Pages release
<!-- vale Vale.Spelling = NO -->

Lifecycle: current

Use this runbook when a Sense6 change affects production deployment, the
`ANALYTICS_DB` binding, or the D1 migration set. Pull-request previews don't
write metrics and don't require a production migration.

## Symptom

- A release adds or changes a runtime metric pair.
- A Pages preview or production deployment doesn't match its source commit.
- The production smoke test reports missing security headers, an open metric
  read path, or `noindex` on the canonical site.
- The Pages Function reports that `ANALYTICS_DB` is unavailable or rejects an
  otherwise allowlisted metric.

## Preconditions

- The pull request is current with `main` and `npm run check:release` passes.
- CI has produced `verified-dist-<commit>` with `dist/`, `dist.sha256`, and
  `dist/build-meta.json` from one build.
- Repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exist;
  never print their values.
- The Pages project is `sense6`, the production branch is `main`, and the D1
  binding is named `ANALYTICS_DB`.
- A database name or identifier has been confirmed in the Cloudflare dashboard
  before running Wrangler. Don't infer it from the binding name.
- A production preflight has recorded live state, drift, blast radius,
  rollback, and operator approval before applying a migration or merging to
  `main`.

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
5. Push the pull-request branch. Wait for the reusable verification workflow,
   browser matrix, production-artifact audit, preview deployment, and preview
   smoke test. The deploy job must download and verify the existing checksum;
   it must not run `npm run build`.
6. Inspect the preview. Confirm substantive localized HTML, `noindex`, and a
   closed metric endpoint. Preview traffic must not increment production
   metrics.
7. After approval, merge to `main`. The production workflow publishes the same
   verified artifact shape and runs:

   ```sh
   node scripts/smoke-production.mjs https://sense6.net <40-character-commit>
   ```

   The probe reads public pages and sends `GET /api/metric`; it never writes a
   metric.

## Verify

- `https://sense6.net/build-meta.json` reports the merged 40-character commit.
- `/en/`, `/en/about/`, and `/en/udito/` return substantive HTML without
  `X-Robots-Tag: noindex`.
- Production returns the checked security-header contract, including HSTS,
  frame denial, no-referrer, and cross-origin isolation headers.
- `GET https://sense6.net/api/metric` with same-origin headers returns `405`.
- The Pages deployment identifies the expected commit and the workflow's
  checksum verification passed before upload.
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
