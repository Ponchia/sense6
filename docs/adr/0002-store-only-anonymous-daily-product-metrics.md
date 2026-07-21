# 0002. Store only anonymous daily product metrics
<!-- vale Vale.Spelling = NO -->
<!-- vale Google.Colons = NO -->

Status: Accepted

Lifecycle: current

## Context

Sense6 needs basic product signals: document loads, measured-test starts,
measured-test completions, and future report downloads. It doesn't need visitor
profiles, attribution, session replay, answer telemetry, or unique-user counts.

Cloudflare Web Analytics doesn't provide the required custom test lifecycle
events. A conventional analytics product would add identifiers and event-level
records that Sense6 doesn't need. The former hash-based router also made
route-level page counts less useful; canonical localized paths now identify
each gallery, exam, and privacy page.

The site must keep answers, measurements, and results in the browser. Metrics
mustn't create a way to reconstruct a visit or connect two actions to the same
person.

## Decision

- Send only an allowlisted `event` and `test` pair to `/api/metric`.
- Count `site_loaded`, `test_started`, `test_completed`, and
  `report_downloaded`. Don't count trial answers, scores, setup details, errors,
  locale, device properties, or navigation.
- Define a visit as a document load. Don't claim that it represents a unique
  person.
- Let the Pages Function derive the coordinated universal time day. Don't accept
  client timestamps.
- Store only `day`, `test`, `metric`, and an aggregate `count` in D1. Don't
  create raw event, visitor, or session tables.
- Don't store or derive IP addresses, hashes, cookies, local-storage analytics
  identifiers, fingerprints, user-agent strings, or referrers.
- Keep the endpoint write-only and use an atomic upsert. Reject cross-origin
  requests, unknown fields, unknown event/test combinations, non-JSON input,
  and bodies larger than 128 bytes.
- Route only `/api/metric` through Pages Functions. A missing binding, exhausted
  quota, or database failure drops the metric without affecting the static site
  or test flow.
- Keep aggregate reads private to the maintainer through Cloudflare. Don't add
  a public reporting endpoint.
- Apply edge rate limiting to `/api/metric`. Use Cloudflare's transient request
  controls for abuse defense without adding a Sense6 visitor identifier.

## Consequences

- Sense6 can compare daily loads, starts, completions, and future downloads by
  test without holding analytics records about a person.
- The counts are activity totals, not unique visitors. Reloads, repeated runs,
  blocked requests, network failures, and bots affect them.
- Same-origin validation and strict schemas stop incidental cross-site traffic
  and constrain writes. They can't prove that a request came from a human.
  Cloudflare edge controls limit abuse, but a determined distributed bot can
  still inflate anonymous counters.
- The app must disclose the aggregate counters and avoid broader claims such as
  “nothing leaves the browser.” It can continue to state that answers,
  measurements, and results stay in the browser.
- Cloudflare still processes the network data required to serve and protect the
  site. This decision prevents Sense6 from copying that data into its product
  metrics; it doesn't alter Cloudflare's infrastructure processing.
