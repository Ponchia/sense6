# 0006. Measure website page traffic without tracking experiment results
<!-- vale Vale.Spelling = NO -->

Status: Accepted

Lifecycle: current

## Context

ADR 0002 remains authoritative for Sense6's own product database: D1 stores
only daily counters for a small allowlist of experiment lifecycle events.
Those counters cannot tell us which public pages are discovered through search,
where page performance regresses, or how the site's audience evolves.

The public website is part of a family of Cloudflare Web Analytics properties.
Using the same provider lets its aggregate page and performance reports be
compared without introducing another analytics application to host.

## Decision

- Use Cloudflare Web Analytics (RUM) **only** on the exact canonical hostname
  `sense6.net`. The JavaScript beacon loads explicitly from our source. Keep
  the Cloudflare registration in **manual JS Snippet installation** mode; never
  turn on automatic zone-wide injection or instrument Pages previews.
- Permit only `https://static.cloudflareinsights.com` in `script-src` and
  `https://cloudflareinsights.com` in `connect-src` alongside the existing
  self-origin entries; retain the restrictive policy for all other origins.
- Enable ordinary History API SPA pageview tracking. No custom events, user
  properties, identifiers, emails, answers, scores, measurements, journal data,
  or experiment lifecycle actions may be sent to Web Analytics.
- Treat pageviews and estimated visits as **provider-reported aggregates**, not
  the same metric as our custom `site_loaded` counter or a unique-person count.
  Respect blocked beacons and avoid forced fallbacks.
- Keep D1 counters and all local-only result storage unchanged.
- Describe the additional Cloudflare processing in every published privacy
  locale, including the separate D1 and RUM responsibilities. Cloudflare says
  its analytics does not use cookies, local-storage identifiers or visitor
  fingerprinting. The fact that no cookies are set does not on its own settle
  every GDPR/ePrivacy requirement; the operator remains responsible for a
  valid legal basis, transparency and cross-border processing disclosures.

## Consequences

- Website performance and discovery signals become comparable with the other
  public projects using Cloudflare, without serving a second analytics stack.
- The additional external script and beacon request are observable network
  activity. Their failure must not interrupt site navigation or test flows.
- Browser page loads and SPA transitions must be smoke-tested after deployment:
  History API instrumentation can change over time and synthetic events in the
  app router must not cause material overcounting.
- Cloudflare Analytics data availability through its GraphQL API depends on
  account/zone dataset limits and should be verified before an external OSS
  aggregation service relies on it.
