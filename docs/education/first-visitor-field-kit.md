# Sense6: first-visitor field kit

Lifecycle: current — 21 November 2026

Related: [product readiness](../product-readiness.md) · [study issue #134](https://github.com/Ponchia/sense6/issues/134) · [classroom resource](../../public/education/browser-reaction-time/index.html)

## Why this study, and what it cannot establish

Sense6 has strong software verification, but that cannot show whether an unfamiliar
person notices the first meaningful action, can complete a chosen experience,
understands the limits of a result, or wants to return. A small first-visitor
review is the next practical step before more tests or content are built.

This is **qualitative usability research**, not scientific validation,
diagnostic evidence, a population sample or a traffic experiment. Do not use
participants' observations to justify rankings, personal norms or health claims.

**Target:** five to eight consenting adults who have not used Sense6 before.
Seek variety rather than statistical balance: several touch/mobile users,
several desktop/keyboard users, and someone who relies on assistive technology
if they volunteer. Do not request health histories or sensory conditions.

## Recruitment copy

> I'm looking for a few people to try Sense6 (sense6.net), a free experimental
> browser-perception site. A session takes about 15–20 minutes. I'll ask you to
> explore it and tell me what is clear or confusing. The tasks are for curiosity,
> not diagnosis. You can skip any task or stop whenever you like. I won't
> collect, record or publish your individual answers or test results. Interested?

Send the invitation personally to relevant contacts or communities that permit
participation requests. Do not scrape contacts, automate messages, or imply
an affiliation with a school, clinic or research institution.

## Session protocol (15–20 minutes)

1. **Consent (2 min).** Explain the activity, that outcomes are private and
   non-diagnostic, and that participation is optional. Ask for permission to
   take brief, non-identifying usability notes. Recording, screenshots or a
   public quote would require separate explicit consent; default to none.
   Do not use form submissions, replay tooling, or analytics identifiers.
2. **Unprompted first visit (3 min).** Open https://sense6.net/ cold. Ask
   "What do you think this site does?" and "What would you try first?" Do not
   explain the interface or point to the first CTA. Note where the person
   looks and whether the first meaningful action was evident.
3. **One chosen task (5–7 min).** Let them select an experiment, or offer
   https://sense6.net/en/riflessi/?scope=signal as a short default if they
   cannot choose. Observe setup, start, pause, completion or abandonment.
   Do not copy or ask them to read out their measured values.
4. **Meaning and trust (3 min).** Ask "What does that result tell you?"
   and "What can it not tell you?" Observe whether the difference between
   a browser observation and a diagnosis is understood.
5. **The way back (2–3 min).** Ask them to find the related explanation,
   private journal, and repeat action without directing them. Ask what, if
   anything, they would return for.
6. **Close and discard (1 min).** Thank them. Explain that comments are
   summarized without identity and that personal results are retained
   locally unless they choose to delete them. If consent is withdrawn,
   discard that session's notes.

### Observe, don't lead

Ask "What would you do next?" rather than "Can you find the Start button?"
Say "What do you think it means?" rather than "Do you notice this warning?"
Allow an authentic unsuccessful attempt; only intervene for safety, an explicit
request for help, or a blocker preventing the task from continuing.

## One-row worksheet per session

Only keep the following coarse categories. Use an arbitrary local session code
such as P01, not names, emails, account identifiers, results or IP addresses.

| Code | Viewport/input | First action seen? | Chosen lab | Setup friction | Finished / chose to stop | Result interpretation | Research/journal/repeat found? | Most important blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | mobile/touch | yes/no | route only | concise issue | completed/stopped | accurate/partial/misleading | each yes/no | non-identifying description |

Write no personal score or raw answer. Avoid preserving verbatim statements
without consent; short paraphrases usually suffice. Retain raw notes only until
a synthesis is recorded, then delete them.

## Interpretations and severity

- **Accurate:** recognizes this as a task-and-device-relative observation,
  not a diagnosis or stable comparison between people.
- **Partial:** can state what happened but confuses device effects, repeated
  runs or the meaning of a result.
- **Misleading:** concludes the task identifies a condition, certifies
  sensory capability, or produces a medically meaningful number.

Treat an inability to start/exit, unannounced audio, a misleading medical
claim, lost data or a serious access barrier as **P0**. Repeated setup
confusion, result misunderstanding or inability to find the next useful
step is **P1**. Cosmetic preferences are **P2**. This is triage for the
specific observed incidents, not a percentage threshold or a statistical test.

## Synthesis and next-release decision

Summarize only:

- Number of consenting participants, broad device/input coverage, and
  which labs were attempted. Do not equate this with production visitors.
- Each distinct P0/P1 pattern, where it occurred, how many participants
  experienced it, and the smallest proposed repair.
- Whether a change is supported by an observation, a hypothesis, or
  an automated test. Keep those three evidence sources separate.
- One measurable qualitative question to repeat after changes.

Fix P0 issues before promotion or expansion. Give P1 fixes precedence over
new experiments or article volume. Re-test only the corrected task with
fresh volunteers where possible; do not manufacture completion percentages
from five people.

## Keeping growth measurement honest

Search Console daily impressions and clicks cannot measure task starts.
Existing Cloudflare daily event counters are **events**, not people,
sessions or a cohort funnel. The private journal records individual runs
only in the visitor's browser. Do not join these sources or introduce
fingerprinting to make a prettier dashboard.

For organic discovery, record the window and source for GSC impressions,
clicks, query and landing-page breakdowns; compare non-branded and branded
queries where available. For AI-citation reports, record each platform's
coverage separately. A citation is not a visit, a crawl is not a citation,
and a submitted sitemap is not proof of indexing.
