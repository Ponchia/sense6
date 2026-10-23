# Sense6 product-readiness review
<!-- vale Vale.Spelling = NO -->

Status: current, 2026-10-12

Lifecycle: current

This is a decision checklist and a reproducible review protocol, **not**
evidence that real participants have tested the site or that Google and Bing
have indexed it. It complements the [roadmap](roadmap.md) and the archived
[five-test evidence audit](research/five-test-evidence-and-product-audit.md).
Never turn this recreational project into a clinical or occupational test.

Follow the work in [first-user study #134](https://github.com/Ponchia/sense6/issues/134),
[human translation QA #135](https://github.com/Ponchia/sense6/issues/135),
[Google/Bing indexing #136](https://github.com/Ponchia/sense6/issues/136),
and [development-tooling security #137](https://github.com/Ponchia/sense6/issues/137).

## What is shipped, and what is not demonstrated

As of 12 October 2026, the build generates 157 canonical URLs: the localized
experiment/site pages plus 72 Learn pages (five guides and one index in each
of 12 published languages). All five experiments have device-relative results,
research links, and an optional private local journal. Automated test and
source-review coverage is substantial, but it is **software verification**.
It does not prove user comprehension, repeatability in humans, clinical
validity, discoverability in search engines, or a translation's native fluency.

Translation catalog review metadata explicitly identifies AI assistance.
Passing `npm run learn:check` does **not** mean human editorial approval.
The application sends only the allowlisted daily aggregate event counts
described in [ADR 0002](adr/0002-store-only-anonymous-daily-product-metrics.md).
Those are activity totals, not unique people or matched session funnels.

## First real-user comprehension review (not yet performed)

**Recruitment:** Ask 5–8 consenting people unfamiliar with Sense6, including
people using small-screen mobile devices and a desktop computer. Include a
keyboard-only or screen-reader participant if possible. This is a small
qualitative usability review, not a statistically representative study.
The maintainer must recruit participants; automated browser tests or simulated
agents do not count as observations of people.

**Consent and handling:** Explain the recreational, non-diagnostic purpose
before the session. Collect the minimum anonymized notes needed for usability.
Do not ask for health history, upload their measured answers/results, create
accounts, add session replay, or silently expand production analytics. Obtain
separate explicit permission for any recording or quote; default to neither.
Discard raw notes when the findings are synthesized.

**Unprompted tasks** (15–25 minutes per person):

1. Open `https://sense6.net/` cold. Ask, “What can you do here, and what would
   you choose?” Observe whether the visitor sees and understands the first CTA.
2. Use the short Riflessi signal task, or another self-selected lab. Observe
   preparation, first interaction, pauses, confusion, and completion or exit.
   For a colour-vision participant, use Screen Colour Lab instead; never imply
   it tests biological tetrachromacy.
3. Ask, “What does your result tell you, and what **doesn't** it tell you?”
   Record their exact interpretation, including whether they notice device
   dependence and the lack of diagnosis.
4. Without directing them, ask how to learn why the device affects a result,
   how to repeat the task, and where they would look for a saved run. Do not
   require them to export or share personal results.
5. Ask what was confusing, tiring, interesting, or worth coming back for.
   Invite the participant to stop any lab at any point.

**Per-participant worksheet** (one row per participant, no identity data):

| ID | Viewport/input | Lab chosen | Start found? | Completion / reason stopped | Interpretation (accurate / partial / incorrect) | Research and journal found? | Observed blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P01–P08 | mobile/desktop, touch/keyboard/AT | lab name | yes/no | result or observed reason | quote or paraphrase | yes/no | concise, non-identifying notes |

An interpretation is *accurate* when it recognizes the observation as
browser/device-relative and non-diagnostic; this rubric is not a judgement
about a person's ability. Record actual starting/completion times only in
consented study notes, not in production visitor telemetry. Separate real
participant observations from hypotheses and scripted automation findings.

**Synthesis and stop conditions:** Group incidents by task and severity, not
by an invented conversion percentage for eight people. Block further feature
expansion for a P0 issue: misleading diagnostic claim, unannounced audio,
inability to start or exit, loss of results, or an accessibility/safety barrier.
Address P1 misinterpretation, abandoned setup, confusing completion feedback,
or language-specific broken tasks before cosmetic P2 changes. Re-test the
specific corrections with participants, not only Playwright.

## Editorial and translation acceptance

The current 11 non-English Learn editions are AI-assisted. None should be
marked *human language reviewed* without a named consenting reviewer and a
recorded pass. English deserves the same plain-language comprehension test.
Work first on the languages with actual readership; in the absence of traffic
data, start with English, Italian, Spanish, then broaden deliberately.

For each locale, a reviewer should read all five **complete** guides and the
Learn index in the rendered desktop and mobile site, checking:

- claims and negations (*can*, *cannot*, not clinically validated), especially
  around tetrachromacy, colour blindness, hearing and visual acuity;
- measurement units, scope names, research citations, device limitations,
  medical/safety boundaries, and the meaning of repeat observations;
- title, metadata, early CTA, breadcrumb, result-to-guide links, source jumps,
  live-region announcements, and locale switching; and
- screen width, typography, truncation and reading order, especially Arabic
  right-to-left and Japanese, Korean, Chinese and Hindi scripts.

Record the locale, date, reviewer, concrete corrections, and relevant routes
in the review issue/PR. AI validation and structural equality are not
substitutes for this sign-off. Keep factual corrections and any corresponding
translation updates aligned with the source hash and publication checks.

## Search and AI visibility: operating checks

The build emits and tests the sitemap, canonical URLs, reciprocal `hreflang`,
indexable static HTML, robots directives and share metadata. These checks
prove the emitted markup, not Google's or Bing's indexing decisions. The
operator should use the verified **Google Search Console** and **Bing
Webmaster Tools** properties, without pasting authentication tokens or private
account credentials into issues.

Record a dated baseline after the 11 October multilingual release: property,
sitemap submitted/last read, discovered and indexed counts (not confused
with the 157 published URLs), excluded pages and reasons, and representative
URL inspection for English, Italian, Spanish and Arabic/Asian editions.
Track impressions, clicks, top queries and landing pages weekly. The first
few days after publishing are insufficient to conclude that a translation is
underperforming. Do not use the Google Indexing API for ordinary article pages
or claim an `llms.txt` file guarantees LLM discovery.

For an excluded page, inspect its exact canonical URL in the correct property.
Check the rendered HTML, HTTP status, robots directives, canonical and internal
links before changing content. If the page is eligible, request indexing once
and retain the submission outcome separately from its eventual indexing state.
Sitemap submission is a discovery hint, not an indexing guarantee. Do not remove
intentional `noindex` directives on private-journal and utility pages to improve
a coverage percentage.

Compare a recommendation with the **current live page** before applying a fix.
A short-description warning can refer to a previous crawl. Use a meaningful
localized summary rather than padding Japanese, Korean or Chinese to an English
character-count target. After a real correction, request a fresh crawl; the old
warning may remain until the search engine processes it.

When available, record Google Search Console's generative-AI report separately
from Bing Webmaster Tools' AI Performance report. Preserve each report's date
range, property, source coverage and metric definition. AI impressions,
citations, citation share, conventional search clicks and referral visits are
different measures. A Bing citation is not evidence of a ChatGPT or Claude
recommendation, and a crawl is not evidence of any recommendation. Keep private
account exports and operational evidence outside the public repository.

Preserve the distinction in `src/crawler-policy.js` between training crawlers
and search/user retrieval. Neither ownership verification nor indexing requests
require additional visitor tracking, a paid analytics service or permission for
training crawlers. Direct links in the project README help readers find the
guides; they are not independent endorsements or a substitute for earned links.

References: [Google URL recrawl requests](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl),
[Google snippet guidance](https://developers.google.com/search/docs/appearance/snippet),
and [Bing site verification](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b).

Use aggregate product events (`site_loaded`, per-lab `test_viewed`,
`test_started`, `test_completed`) only as directional activity counts. A
ratio between two daily totals is **not** a participant completion rate; no
unique visitor or cross-event session identifier is collected. A user study
can investigate abandonment without changing this privacy decision.

## Next-development decision

Resume new experiment concepts or major redesigns only after: production CI
and live deployment are green; P0 usability/accessibility findings are fixed;
the first independent participant round is summarized; the language review
plan has responsible reviewers; and Search Console/Bing indexing evidence has
been checked rather than inferred from sitemap presence. Continue small
behavior-preserving fixes while evidence is collected.
