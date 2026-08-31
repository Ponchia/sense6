<!-- vale off -->
# Five-test evidence and product audit
<!-- vale on -->
<!-- vale Vale.Spelling = NO -->
<!-- markdownlint-disable MD013 -->

Status: accepted and implemented; evidence audit performed against `main` at
`04b24134a56b080bac6461b01762409b7c5970ce`; implementation tracked in PR 37,
2026-07-20

Lifecycle: archive

This report reviews the scientific basis, shipped protocol, public duration,
result completeness, interface, competitors, reusable open-source work, and
automated verification for all five Sense6 experiments. It is a product
decision aid, not a validation study.

The central finding is simple: Sense6 has a strong software and trust
foundation, but the scientific strength varies by instrument. Longer tests are
not automatically better. The immediate priority is to make each result say
exactly what its existing protocol supports, repair a small number of protocol
integrity defects, and version the methods. Optional depth should then mean a
clearly defined scope or an independent repeat—not an unexplained multiplier on
trial count.

## Executive decision

Keep Sense6 permanently recreational, nonclinical, local-first, and
non-diagnostic. Approve a result-integrity tranche across all five tests before
adding new constructs or longer protocols.

| Test | Current public burden | Timing finding | Product decision |
| --- | ---: | --- | --- |
| Tetracromia | 26 forced choices and 3 ordering blocks; about 4 minutes advertised | Plausible, but too short for a stable threshold or composite | Reframed as **Screen Colour Lab** with three separate observations |
| Daltonia | 20–41 total practice, measured, and control presentations; about 3 minutes | Plausible for a short display-relative track, not for cone thresholds or screening | Stimulus and response integrity repaired; result remains exploratory |
| Riflessi | 8 practice + 22 signal events; 8 practice + 32 choice events; 180-second sustained block; about 7 minutes | Honest | Quality, interpretation, setup evidence, and selectable task bundles shipped |
| Udito | 42–74 audible presentations plus reference and anchors; about 6 minutes | Honest | Separate measures, control scheduling, bounds, and setup gates repaired |
| Acutezza | 24 Focused or 44 Standard interactions per eye; 48 or 88 for two eyes | Already a deep protocol; 4–8 minutes is plausible | Calibrated sharpness repaired; Meridiani implementation removed |

The recommendation is **not** to replace all five tests with generic Quick,
Standard, and Deep versions. Use three distinct choices:

- **Scope** selects independent instruments, such as Segnale only versus the
  complete Riflessi profile.
- **Standard measurement** is one frozen, versioned protocol with declared
  quality gates.
- **Repeat for consistency** runs a second independent Standard block and shows
  agreement or disagreement. It never pools silently or keeps only the best.

A no-score tutorial can precede difficult tasks. A research protocol can exist
when a genuinely different, long method is justified, but it must not inherit a
consumer result name without its own evidence.

## Implementation status

The product and software corrections identified by this report are complete.
The implementation deliberately does not claim that automated checks establish
construct validity, external validation, population norms, or clinical meaning.

| Area | Implemented outcome |
| --- | --- |
| Protocol identity | Frozen method and scope passports; legacy schema-one entries migrate to a separate cohort; changed methods don't compare |
| Source integrity | One categorized ledger generates interactive, localized static, and text-discovery source surfaces; exact Sense6 validation remains empty |
| Tetracromia | Screen Colour Lab wording; three observations; no composite, band, meter, best result, profile, or radar; resize invalidates the run |
| Daltonia | First-paint and duplicate-response lock; input validation; matched linear-sRGB luminance distributions; controls, bounds, and evidence retained |
| Riflessi | Signal, signal + choice, and complete scopes; strengthened quality gates; full denominators, physical setup, interruptions, and safer interpretation |
| Udito | Focused and Standard scopes; maximum-level reference and audibility anchors; controls before stopping; recent ceiling evidence; final volume confirmation |
| Acutezza | Focused and Standard scopes; per-condition controls; actual contrast and calibration provenance; distance recheck; lower precision; 90% model intervals; Meridiani code removed |
| Verification | Production-dose invariants, focused-scope journeys, P0 regressions, and selected full Firefox and WebKit journeys added |

The remaining work is evidence generation, not an unfinished application fix:
observer simulations, participant comprehension and timing work, agreement
analysis, and any independently designed future protocol. Those activities can
support better recreational wording. They must not turn Sense6 into a screening,
diagnostic, medical, occupational, or population-classification service.

## How this audit was performed

The review combined four evidence streams:

1. Direct inspection of the shipped controllers, domain models, renderers,
   source registry, locale catalogs, journal records, and browser tests.
2. Fifteen independent SOL-agent research passes: one scientific/reference
   audit, one competitor and interface audit, and one dose/depth/result audit
   for each of the five tests.
3. Five independent SOL-agent lead reconciliations that checked disputed
   calculations, references, licences, and recommendations against the
   implementation.
4. Desktop and mobile walkthroughs of every live setup and route, supported by
   the existing automated accessibility and responsive suites.

Competitor behaviour is separated into **observed implementation**, when a
runnable public flow or public source was available, and **advertised claim**,
when only product material was visible. Clinical or commercial claims are not
treated as proof. Likewise, a publication that informed one component does not
validate Sense6's complete protocol.

### Evidence layers

These four layers must remain distinct in code, documentation, and public copy:

| Layer | Question | Current Sense6 position |
| --- | --- | --- |
| Software verification | Does the implementation follow its declared algorithm and survive supported browser states? | Strong, with the specific gaps in this report |
| Construct validity | Does the task measure the named property rather than a nuisance cue or mixed construct? | Mixed; strongest for simple response and calibrated Landolt-gap tasks |
| External validation | Does Sense6 agree with a suitable reference method, and is it repeatable across relevant conditions? | Not established for any complete Sense6 test |
| Norms and decisions | Can a score classify people or support clinical, occupational, or population decisions? | Deliberately absent and out of scope |

Automated tests can establish the first layer. They cannot establish the other
three.

## Cross-test findings

### The advertised times are not concealing one common shortcut

The five protocols differ too much for one trial-count rule. Tetracromia is
brief relative to its result detail, while Acutezza is already long. Riflessi
and Udito have reasonable public durations for their actual scheduled work.
Daltonia is a short custom track whose wording, not merely length, is the main
problem.

All public trials are self-paced unless a response window is explicitly part of
the task. Consequently, registry durations are product estimates rather than
hard upper bounds. Setup is generally excluded from the measured duration.
Future duration copy should state a measured median and a broad completion
range after real-user telemetry or a consented usability study; it should not
invent an exact maximum.

### Automated browser fixtures are intentionally faster than public tests

| Test | Browser-test strategy | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Tetracromia | Uses the public fixed schedule | Full route and result flow | Human repeatability, calibration, or validity of the score |
| Daltonia | Uses the production configuration but can follow a rapid early bound path | Adaptive state and result flow | Typical public dose or precision |
| Riflessi | Uses a localhost-only accelerated timing fixture | State transitions, interruption handling, and result rendering | Seven-minute public timing or human timing reliability |
| Udito | Uses a localhost-only shortened audio fixture | Web Audio lifecycle, response locking, and result flow | Public acoustic burden, device audibility, or sound-level safety |
| Acutezza | Uses a localhost-only shortened calibration/task fixture | Calibration and multi-eye flow, result and layout contracts | Public trial dose, human calibration accuracy, or visual threshold validity |

The accelerated fixtures are appropriate software tests. They should remain
clearly test-only and be paired with unit tests that assert production schedule
invariants. Complete journeys currently concentrate on Chromium and mobile
Chromium; Firefox and WebKit receive cross-browser smoke coverage rather than a
full journey for every instrument. Expanding one full happy path and one
interruption path per engine is a useful P1 compatibility improvement, not a
scientific-validation step.

### Shared result and protocol identity

Every new journal entry should retain enough provenance to stop incompatible
runs from appearing comparable:

- `methodVersion` and `profileId`;
- a stable `configDigest` and `stimulusVersion`;
- estimator, stopping rule, response-window, interruption, and replay policies;
- compact control, convergence, bound, and setup-quality evidence; and
- the browser/display/audio passport fields that materially affect that test.

Changing one of these fields should create a new comparison cohort. Old entries
remain readable and explicitly exploratory; they are not silently migrated into
a new method.

### One source ledger, four source roles

The README, exam modules, presentation registry, interactive pages, and static
pages currently repeat overlapping source metadata. That invites drift, such as
Tetracromia citing CIEDE2000 even though it calculates ΔEOK.

Create one categorized source ledger and render every public list from it:

- `method`: directly informs a shipped algorithm or control;
- `boundary`: establishes what the browser task cannot claim;
- `comparator`: describes a related instrument without validating Sense6; and
- `validation`: reserved for a study of the exact versioned Sense6 protocol.

No current paper belongs in the last category.

### Interface and localization

The live setups are visually coherent and unusually transparent for consumer
perception tests. They show duration, equipment, method, research links,
limitations, privacy, and local processing before consent. Mobile layouts
reflow without obvious overflow; surrounding UI supports keyboard navigation,
reduced motion, right-to-left flow, and localized static entry pages. The locale
audit found 868 messages across 12 locales with 98.5–100% coverage, plus English
fallback. Those are product strengths worth preserving.

One repeated copy defect should be fixed in all five setup consent labels: the
literal space after a closing `<strong>` element is missing, producing text such
as `diagnosis.I` or `diagnosis.The`. The affected controllers are
`src/exams/tetracromia.js:132`, `src/exams/color-blindness.js:270`,
`src/exams/riflessi.js:232`, `src/exams/udito.js:238`, and
`src/exams/acutezza.js:94`.

Longer profiles also need a pre-start value card, whole-run progress on mobile,
a break policy, and an explicit statement of what restart or visibility loss
does to the active trial. Automated accessibility is strong evidence of
implementation quality, but it is not a substitute for testing instructions
with people who use assistive technology.

## Tetracromia

### Tetracromia decision and defensible construct

Tetracromia is a polished recreational screen-colour battery. Its defensible
construct is performance in three short, non-equivalent colour tasks using the
integer-sRGB colours rendered by one browser, display, environment, and session.
It is not a tetrachromacy test, calibrated chromaticity measurement, stable hue
profile, or validated general colour-discrimination score.

Keep it only as an exploratory **Screen Colour Lab** until P0 work is complete.
Tetracromia may remain a secondary brand, but the current title and search
framing should no longer outweigh the otherwise clear RGB limitation.

### Tetracromia audited baseline protocol

| Stage | Current protocol |
| --- | --- |
| Setup | Eleven-step grayscale check, environment/filter guidance, forced-colours rejection, and self-attestation; no characterization of gamma, primaries, white point, luminance, or actual gamut |
| Threshold | 14 responses in a 16-alternative odd-tile task; OKLCH hue shift starts at 21°; two-correct-down ×0.76 and one-error-up ×1.26; clamp 1.2–26° |
| Field | 12 responses among four independently generated dot fields; one entire field is hue-shifted; starts at 24° with the same staircase |
| Sequence | Three nine-colour ordering blocks over different 92° arcs; two anchors and seven movable colours; normalized inversion scoring |
| Result | Median of the last six reversals when at least four exist, otherwise median of the final six presented levels; two transformed component scores and Sequence are combined 35/35/30 |

The dose is 26 forced-choice decisions plus three ordering blocks. An ordering
block can contain an unbounded number of drag, swap, or keyboard operations.
There is no practice, catch/control trial, response deadline, convergence stop,
minimum-reversal requirement, break, pause, or visibility-loss invalidation.

Four minutes is plausible as a product estimate, not an established duration.
The theoretical input locks allow much faster automation, while a person can
take arbitrarily long on ordering.

### Completeness and result integrity

Exhaustive answer-path enumeration found:

| Output | Reachable reported estimate | Reachable component score | Reversals |
| --- | ---: | ---: | ---: |
| Threshold | 5.3246–26° | 8–91 | 0–8 |
| Field | 8.0069–26° | 18–83 | 0–7 |
| Sequence | Three independent arc scores | 0–100 | Not applicable |
| Overall | No coherent physical unit | 9–91 | No uncertainty available |

An all-correct run therefore produces 91, not 100. The advertised 1.2° floor
cannot be reported by the fixed 14/12-response protocol. The score offset,
multiplier, component weights, and bands have no methodological source.

The seven-spoke radar pools only three or four binary observations per spoke
across tasks with different chance rates, stimuli, and adaptive difficulty. It
cannot identify stable stronger or weaker hue directions. Sequence covers three
non-repeated 92° arcs rather than a repeated full hue circle.

The result also omits convergence, uncertainty, bounds, task controls,
interruption state, actual rendered-pixel differences, and enough method
metadata for longitudinal comparison. Every run is currently journaled as
usable, and only the highest arbitrary overall score is retained. Both choices
select confidence that the protocol has not earned.

### Stimulus and interface risks

- Threshold and Field use different chance rates but feed the same style of
  score transformation.
- Field uses four independent noise realizations, unlike an embedded target in
  one common luminance-noise mosaic. Texture differences can help selection.
- ΔE is computed from requested continuous OKLCH coordinates, while stimuli are
  gamut-mapped and rounded to 8-bit sRGB. The result is not the ΔE between the
  actual rendered pixels.
- The P3 media query changes a metadata chip, not stimulus output.
- A code-level sRGB probe found about 3.2% modelled relative-luminance separation
  at the largest threshold shifts and about 2.9% in Field. This is not a monitor
  measurement, but it rules out calling the cue purely chromatic.
- Candidate hover adds brightness. Correct/miss feedback begins after the next
  stimulus renders, and its 240 ms animation overlaps the next 180 ms response
  lock by about 60 ms.
- Resizing regenerates Field content and dot count during a trial.
- Mobile hides the full stage list; sixteen Threshold choices have no direct
  keyboard mapping.

### Reference corrections and additions

Keep [Jordan et al. (2010)](https://doi.org/10.1167/10.8.12) as a functional
tetrachromacy study, not browser validation. Add
[Jordan and Mollon (2019)](https://doi.org/10.1016/j.cobeha.2019.08.002)
as the strongest direct ordinary-RGB boundary.

The implementation calculates ΔEOK, consistent with
[CSS Color 4](https://www.w3.org/TR/css-color-4/#color-difference-OK). Remove
[Luo, Cui, and Rigg's CIEDE2000 paper](https://doi.org/10.1002/col.1049) from the
shipped-method list unless production changes to ΔE00.

Add these sources before making stronger method claims:

- [Regan, Reffin, and Mollon (1994)](https://doi.org/10.1016/0042-6989(94)90203-8)
  for the actual Cambridge Colour Test stimulus, geometry, luminance noise, and
  adaptive boundary;
- [Levitt (1971)](https://doi.org/10.1121/1.1912375),
  [Treutwein (1995)](https://doi.org/10.1016/0042-6989(95)00016-X), and
  [García-Pérez (1998)](https://pubmed.ncbi.nlm.nih.gov/9797963/) for adaptive
  staircase targets, bias, and stopping rules;
- [Leadbeater et al.](https://pubmed.ncbi.nlm.nih.gov/36690890/) as a model for
  browser-versus-laboratory agreement and Bland–Altman validation; and
- [Evans et al.](https://openaccess.city.ac.uk/id/eprint/34848/) as evidence that
  commercial displays can materially reduce a colour screener's sensitivity.

The Cambridge Colour Test reproducibility paper is a caution: reported
normal-trichromat repeatability was low to moderate. The X-Rite online challenge
is also explicit that it does not replace the physical FM100. Update its URL to
[the canonical FM100 page](https://www.xrite.com/fm-100-hue-test).

### Tetracromia competitors and reusable work

Public tetrachromacy quizzes often combine a few images or self-report questions
with labels such as “Potential Tetrachromat.” They are marketing comparators and
trust anti-patterns. A public site that labels an Ishihara-number task
“Cambridge Colour Test” is an especially useful warning against borrowing a
scientific name without its method.

The real Cambridge Colour Test and physical FM100 define the scientific
reference boundary. X-Rite's online ordering challenge provides a useful
drag-and-drop and disclosure precedent. Sense6 is stronger than the marketing
comparators on privacy, accessibility, method visibility, and its setup
boundary; its audited result screen was less cautious than its own landing page.

Potentially reusable or useful independent implementations:

| Project | Licence | Appropriate use |
| --- | --- | --- |
| [jsQuestPlus](https://github.com/kurokida/jsQuestPlus) | MIT | Adaptive estimator candidate after observer simulation and protocol definition |
| [jsPsych](https://github.com/jspsych/jsPsych) and [jspsych-psychophysics](https://jspsychophysics.hes.kyushu-u.ac.jp/) | MIT | Experiment lifecycle, timing, response, and ordering interaction patterns |
| [Color.js](https://github.com/color-js/color.js) | MIT | Direct dependency or differential oracle for colour conversions and gamut mapping |
| [Colour](https://github.com/colour-science/colour) | BSD-3-Clause | Offline oracle for conversion and simulation fixtures |
| [CVD for R](https://cran.r-project.org/package=CVD) | GPL-3.0-or-later | Independent FM100/D15 analysis oracle; do not copy code into the MIT application |
| [psignifit](https://pypi.org/project/psignifit/) | GPL-3.0 | Offline psychometric reference, not a direct dependency |
| [AEPsych](https://github.com/facebookresearch/aepsych) | CC-BY-NC-4.0 | Research inspiration only; not unrestricted MIT-compatible reuse |

No permissively licensed drop-in browser clone transfers CCT or FM100 validity
to Sense6.

### Tetracromia modes and backlog

- **Try instruments:** 1–2 minutes of obvious examples, no score, threshold,
  journal entry, or comparison.
- **Quick observation:** 19 recorded/control blocks plus three practice
  interactions; about 2–4 minutes; report observations and control status only.
- **Standard:** after redesign, 78–110 recorded/control blocks plus five practice
  interactions; provisional 8–12 minutes; separate task estimates, controls,
  stopping rules, bounds, and uncertainty.
- **Repeatability:** two independent Standard blocks with a break and setup
  recheck; provisional 18–27 minutes; show both and their agreement.
- **Deep research map:** 373–597 recorded/control blocks over multiple sessions,
  roughly 28–45 minutes. Do not build this as a normal consumer mode now.

P0: remove the composite, score bands, best score, and interpretive radar;
replace threshold/profile wording; disclose exact dose; correct sources; remove
hover/feedback contamination; invalidate material display changes; mark old
entries `tetracromia-v1` exploratory.

P1: redesign Field around one common noise realization if retaining CCT
inspiration; add practice, controls, balanced positions/directions, simulated
observers, declared stops, bounds, uncertainty, rendered stimulus provenance,
whole-run progress, and separate ordering interpretation.

P2: predeclare endpoints, measure completion and learning, establish test–retest
agreement, and compare with appropriate calibrated tasks before restoring
threshold, direction-strength, or norm-like labels.

## Daltonia

### Daltonia decision and defensible construct

Daltonia is a custom HPE-like RGB-to-LMS display-coordinate experiment. It can
remain a recreational description of three colour directions on one display.
It is not CIE 2006 cone contrast, a Cambridge Colour Test implementation, a
clinical screen, or a classification of protan, deutan, or tritan deficiency.

The protocol is short but not automatically too short for an exploratory
track. The immediate issues are a pre-paint response race, residual luminance
cues, sparse controls, heuristic uncertainty, and over-specific result words.

### Daltonia audited baseline protocol

- Two successful high-contrast practice responses are required.
- Three independent protan-like, deutan-like, and tritan-like display axes are
  interleaved.
- Each axis schedules up to 12 measured trials; three controls are inserted,
  for at most 39 measured/control presentations.
- Each target has four C-gap directions plus a no-gap response.
- The adaptive level starts at 0.2, is bounded to 0.035–0.32, uses a
  two-correct-down/one-error-up rule, starts with a 0.055 step, and shrinks the
  step by 0.65.
- A track can stop early at a floor or ceiling. The estimate uses the last four
  reversals when at least two exist; otherwise it uses the last three levels.
  Three reversals are labelled settled.
- The run passes controls at 2/3.

The measured/control dose is 18–39; including successful practice gives 20–41.
An all-correct path is 33 because of floating-point boundary progression. There
is no response deadline, so three minutes is plausible but not an upper bound.

### Daltonia baseline completeness and protocol risks

- Response buttons become active before the new canvas is guaranteed to have
  painted. A pre-paint or double submission can score against a stimulus that
  the person did not see. The browser test waits for changed pixels and masks
  this race.
- Arbitrary response strings are accepted as misses rather than rejected.
- There are no null catches, target-position quotas, visibility-loss rules, or
  pause semantics.
- The protan-like modelled luminance deviation grows from about 0.65% to 5.90%;
  the deutan-like path from about 1.35% to 12.34%; tritan-like is near zero.
  The task is therefore not isoluminant.
- A 2/3 control gate has a 15.625% chance pass under five-choice guessing.
- Twelve trials per axis and the custom reversal rule do not justify precise
  threshold language. The Cambridge Colour Test commonly targets eleven
  reversals, which is not evidence that Sense6 should copy that number, but it
  illustrates the gap.
- The mathematical floor/ceiling inequalities are correct; the public prose
  describes their meaning in the opposite direction.
- Journal records retain controls but lose limit state, reversal count,
  presentation count, and method version. Quality is based almost entirely on
  the control total.

The exact matrix provenance should be corrected. The matrix is the older
Hunt–Pointer–Estévez transform multiplied by the standard sRGB-to-XYZ matrix,
matching a common 2016 implementation lineage. It is not the CIE 2006
physiological cone-fundamental transform.

### Daltonia references to correct and add

Categorize existing Cambridge and colour-vision sources as boundaries or
comparators unless they describe the exact shipped component. Add:

- the Hunt–Pointer–Estévez transform and
  [IEC 61966-2-1 sRGB](https://webstore.iec.ch/en/publication/6169) for the actual
  matrix lineage;
- [Levitt (1971)](https://doi.org/10.1121/1.1912375) and
  [García-Pérez (1998)](https://pubmed.ncbi.nlm.nih.gov/9797963/) for adaptive
  method claims;
- work on luminance artefacts in pseudoisochromatic stimuli, namely
  [Regan, Reffin and Mollon (1994)](<https://doi.org/10.1016/0042-6989(94)90203-8>),
  which introduces the luminance noise that makes residual luminance cues
  unusable and removes the need to define equiluminance per observer;
- CCT repeatability evidence and calibrated-versus-home-display evidence before
  claiming longitudinal precision; and
- a current review of acquired colour-vision deficiency if the safety copy
  discusses new or changing colour perception.

Brettel and Machado are useful simulation sources, not measurement validation.
Simulation of colour-vision deficiency and measurement of an observer are
different constructs.

### Daltonia competitors and reusable work

EnChroma, EyeQue, X-Rite, Waggoner, the City Colour Vision Test, and
ClearColorVision show common consumer patterns: plate-like tasks, short setup,
type/severity labels, product funnels, or calibrated claims. Sense6 should keep
its superior method disclosure and avoid adopting diagnostic labels from these
flows.

| Project | Licence or access | Appropriate use |
| --- | --- | --- |
| [Penn Anomaloscope](https://github.com/BrainardLab/PennAnomaloscope) | MIT | Genuine open instrument precedent, but hardware-specific; no validity transfer |
| City Dynamic Colour Vision Test | GPLv2/source on request | Method comparator; resolve access and licensing before any reuse |
| [ReVISit](https://revisit.dev/) | BSD family | General experiment framework; plate rights and validation remain separate |
| TypeScript Ishihara renderers | Often MIT | Rendering ideas only; Ishihara content and a custom C-gap track are different instruments |
| [DaltonLens/libDaltonLens](https://github.com/DaltonLens/libDaltonLens) | Permissive simulation libraries | Simulation and colour-math oracle, not observer measurement |

No public permissive implementation makes the current algorithm a validated
screening service.

### Daltonia modes and backlog

- **Try task:** two practice responses, three controls, and three observations
  per axis—14 interactions; no threshold or comparison.
- **Standard:** a redesigned fixed protocol with enough independent/interleaved
  evidence to satisfy declared stopping and precision rules. The initial design
  envelope is 45–81 measured presentations and a provisional 4–6 minutes, to be
  established empirically.
- **Repeatability:** two independent Standards under the same setup, roughly
  8–12 minutes; show track-level agreement.
- An eight-direction discrimination ellipse is a new research instrument, not a
  hidden Deep version of the current result.

P0: lock responses through first paint and against duplicates; validate response
values; remove or quantify luminance cues; correct bound copy and matrix
provenance; replace precision language; store actual schedule, limits,
reversals, controls, and version.

P1: add practice/catch balance, visibility and interruption policy, simulations,
track-specific stopping/uncertainty, compatible-run checks, and real duration
data.

P2: establish repeatability and compare the frozen protocol with an appropriate
calibrated colour instrument before introducing type, severity, or screening
language.

## Riflessi

### Riflessi decision and defensible construct

Riflessi is a credible device-relative visual response exercise. Its roughly
seven-minute duration is honest. Segnale is the strongest construct; Scelta and
Tenuta remain useful descriptive tasks if the result stops borrowing stronger
psychometric language than their custom designs support.

### Riflessi audited baseline protocol and timing

| Instrument | Current protocol |
| --- | --- |
| Segnale | 8 practice events, then 20 signal events and 2 catch events |
| Scelta | 8 practice events, then 32 balanced left/right choices |
| Tenuta | A fixed 180-second sustained-response block |

Responses below 100 ms are anticipations. Early/catch responses count as false
starts. Correct feedback lasts about 520 ms. Based on the actual delays and
windows, the measured core is about 350–484 seconds (5.83–8.07 minutes), with a
central path near 6.31 minutes plus setup. The public seven-minute description
is therefore reasonable.

Browser timestamps are device- and event-loop-relative. A `requestAnimationFrame`
timestamp precedes physical photon onset, and an input-event timestamp is not a
physical switch timestamp. Exact millisecond formatting should not imply
laboratory hardware timing.

### Riflessi completeness and interpretation risks

- Segnale's 20 trials have a reasonable precedent for a short simple-response
  estimate, but no published paper validates this exact browser implementation.
- “Choice cost” is a descriptive difference between fixed-order blocks with
  different stimuli and motor demands. It is not a pure cognitive decomposition.
- Scelta accuracy excludes consumed early trials from its denominator. Report
  scheduled accuracy and conditional valid-response accuracy separately.
- Catch events test premature response in Segnale. They do not establish general
  inhibitory control.
- Tenuta is not PVT-B. It uses a different event schedule, deadline, and result
  model, and omits the validated lapse metric.
- The usable gate can pass with 12 Segnale, 19 Scelta, and 6 Tenuta samples and
  does not integrate catches, accuracy, early responses, misses, late events, or
  timing health.
- Median absolute deviation is stored and combined as if it were uncertainty of
  the estimate. It is within-run response spread, not a confidence interval.
- An interrupted Scelta trial resumes with the same revealed side even though
  the copy promises a fresh event.
- The global Space handler can prevent activation of a focused button outside
  the timed runner.
- Exact scored-trial feedback can encourage strategy changes; the visible
  Tenuta countdown can create an end-spurt.

### Riflessi references to correct and add

Correct the PVT-B citation authors to Basner, Mollicone, and Dinges. Its result
that a three-minute PVT-B had effects averaging 22.7% smaller than the ten-minute
PVT supports one specific modified protocol; it does not validate any short
sustained-response task.

Deary's work describes standalone simple and four-choice reaction-time
instruments, not a browser two-choice implementation. Bridges is a platform-class
source, not validation of the Sense6 result.

Add or retain clearly categorized work on:

- simple and choice response reliability, including Hamsher and later
  test–retest studies;
- web timing and browser-versus-laboratory agreement, including
  [Anwyl-Irvine et al.](https://doi.org/10.3758/s13428-020-01501-5);
- the choice-reaction versus Hick-law construct and repeated-session practice
  effects;
- `requestAnimationFrame`,
  [Event timestamps](https://w3c.github.io/uievents/#dom-event-timestamp), and
  browser visibility/lifecycle standards; and
- [jspsych-psychophysics](https://jspsychophysics.hes.kyushu-u.ac.jp/) as an
  implementation precedent, not an external validation source.

### Riflessi competitors and reusable work

Human Benchmark excels at immediate interaction but over-relies on population
comparison. PsyToolkit exposes instructions and research context but is less
consumer-polished. TestMyBrain shows the value of task-specific forms and
versioned protocols. Clinical cognition services add governance and norms that
cannot be inferred from a similar interface.

| Project | Licence or access | Appropriate use |
| --- | --- | --- |
| [jsPsych](https://github.com/jspsych/jsPsych) | MIT | Mature timeline, data, response, and lifecycle patterns |
| [jspsych-psychophysics](https://github.com/kurokida/jspsych-psychophysics) | MIT | Visual presentation and frame-aware scheduling reference |
| [PsychoJS](https://github.com/psychopy/psychojs) | MIT | Experiment lifecycle and repeatable protocol reference |
| PsyToolkit | Source-visible service; no general permissive reuse assumption | Transparent comparator; confirm permission before code reuse |
| TestMyBrain | LGPL-3.0 code; some stimuli CC-BY-SA | Versioning/forms precedent; observe copyleft and asset licences |

### Riflessi modes and backlog

- **Segnale:** about 2 minutes, reporting only device-relative simple response.
- **Segnale + Scelta:** about 4 minutes, reporting the two tasks and their
  descriptive difference.
- **Complete set:** about 7 minutes, including the existing 180-second
  Tenuta block.
- **Repeat for consistency:** repeat the identical selected bundle, preferably
  on another day with the same device/input. Do not pool or retain only the best.
- A 60-second Tenuta is a new task and must not inherit the current construct.

P0: strengthen the quality gate; retain scheduled and valid denominators;
relabel spread and block difference; stop calling custom Tenuta events PVT-like
lapses; replay a new random choice after interruption; scope the Space handler;
reduce score-shaping feedback and countdown effects.

P1: record physical setup and method version, add whole-run progress and breaks,
test public timing invariants, and define repeatability outputs.

P2: measure device/browser timing offsets, learning, within-person agreement,
and agreement with an appropriate reference protocol before making stable-trait
or population claims.

## Udito

### Udito decision and defensible construct

Udito is a polished, transparent recreational psychoacoustics lab. It can report
device-relative task observations under one browser, output device, connection,
and volume setting. It is not audiometry, a hearing screen, dB HL, a hearing age,
or evidence that hearing is normal.

The adapted Woods headphone check retains narrow evidence about presentation
confidence. It does not prove headphones were used, validate the other two
instruments, or establish auditory sensitivity. Portata and Intonazione remain
exploratory.

### Udito audited baseline protocol and timing

| Stage | Current protocol |
| --- | --- |
| Reference | One 1 kHz, 1.8-second quiet reference |
| Cuffie | 2 practice and 6 scored Huggins-pitch-style trials; all six required for a pass |
| Portata | Adaptive 2.5 kHz to `0.42 × sampleRate`; 8 reversals; 12–28 records; controls scheduled at presentation positions 9 and 18 |
| Intonazione | Separate tracks near 500 Hz and 2 kHz; 6 reversals; 10–18 trials each; ±3 dB level rove |

The total is 42–74 audible presentations plus reference. Scheduled tones and
feedback occupy about 89.5–155.8 seconds; setup and human decisions make six
minutes a fair central estimate. There is no strict upper bound.

The maximum nominal tone-on time is about 59.8 seconds including the reference.
After panning, code-level per-channel peaks are approximately 0.059 for the
reference, 0.053 for Cuffie, 0.044 for Portata, and 0.058 for Intonazione. These
digital values support internal consistency, not SPL safety; browser code does
not know headphone sensitivity, fit, system gain, or ambient sound.

### Udito baseline completeness and protocol risks

- Portata can converge before presentation 18 and therefore omit its second
  control, then fail a result gate that expects both controls.
- Any two correct responses at the frequency ceiling—not necessarily recent or
  consecutive—can force a ceiling result even if later evidence contradicts
  them.
- There is no lower-frequency audibility gate near 200 Hz and no audibility gate
  at the 500 Hz and 2 kHz pitch anchors. Failure to hear the carrier can look
  like poor pitch discrimination.
- `safeFrequencyCeiling` is a Nyquist/rendering margin, not a device-safe
  frequency or loudness boundary.
- Reversal spread divided by two is stored as uncertainty, and two track spreads
  are combined in quadrature. This is not a confidence interval.
- Bound representation is incomplete for Portata and pitch tracks.
- `selfReportedVolumeConsistent` is stored as true without an end-of-run
  confirmation.
- Journal comparison checks device, connection, and sample rate but not method
  version.
- The 60% setup threshold is a heuristic. Add explicit tinnitus,
  hyperacusis/discomfort, and stop-immediately guidance without implying a known
  safe SPL.

### Udito references to correct and add

Correct the title metadata for Grassi et al. and separate the Mok and Zhao
attributions. Keep
[Woods et al.](https://doi.org/10.3758/s13414-017-1361-2) for the narrow
headphone-screen component and
[Zhao et al.](https://doi.org/10.1177/23312165221118792) for robust online
psychoacoustic implementation patterns. Neither validates the full battery.

Add:

- Milne et al. for the original Huggins-pitch headphone screen;
- the SNAPlab online headphone-test work as a modern comparator;
- [Lunney et al.](https://doi.org/10.1002/lary.28258) and other hearWHO
  evaluations to illustrate what external screening validation requires;
- Vercammen et al. on consumer self-test validity and limits; and
- [ASHA's adult hearing-screening guidance](https://www.asha.org/practice-portal/professional-issues/adult-hearing-screening/)
  as a professional boundary, not a method source.

If speech in noise is added, it needs its own localized materials, scoring,
language/dialect evidence, version, and reference set. It is not a deeper
Portata trial.

### Udito competitors and reusable work

Commercial/DIN-inspired services show concise setup, left/right flows, and
action-oriented results, but their calibration, proprietary norms, or device
governance do not transfer. Sense6 is stronger on local privacy and explicit
device dependence.

| Project | Licence or access | Appropriate use |
| --- | --- | --- |
| [ChaitLab HeadphoneCheck](https://github.com/ChaitLabUCL/HeadphoneCheck_Test) | GPL-3.0 | Headphone-screen reference; not direct MIT code reuse |
| [HALT](https://github.com/klausfrieler/HALT) | MIT | Open headphone-check method with reported sensitivity/specificity; validate local adaptation separately |
| SNAPlab online tests | BSD-3-Clause code; content CC-BY-NC-SA | Architecture/reference; content has noncommercial/share-alike restrictions |
| dbSPLab DIN specification | CC-BY-4.0 specification | Workflow comparator; no transferred audio calibration or norms |
| [EasyEyes Threshold](https://github.com/EasyEyes/threshold) | MIT | Calibration and experiment infrastructure; its preprint is not validation of Udito |

No public implementation can turn nominal browser amplitude into dB HL without
an appropriate calibration chain.

### Udito modes and backlog

- **Focused 3–4 minute scope:** reference, Cuffie, and a repaired complete
  Portata track.
- **Standard 5–7 minute scope:** all three repaired instruments.
- **Deep 10–14 minute research protocol:** Standard plus independent,
  counterbalanced Portata and Intonazione repeats, with a break and setup
  reconfirmation. Present repeatability rather than a more exact-looking single
  number.
- **Everyday listening:** a future speech-in-noise instrument with its own
  localization and evidence, not a hidden depth option.

P0: guarantee controls before Portata can stop; make ceiling evidence recent and
declared; add carrier audibility checks; correct safety names, bounds, and
uncertainty; ask whether volume stayed fixed; version the method.

P1: simulate adaptive tracks and stopping rules, store full compact quality
evidence, measure real completion ranges, and implement scope/repeatability UX.

P2: evaluate test–retest and device/connection effects. Only pursue a validated
speech-in-noise comparison if its localization burden and product value justify
the work.

## Acutezza

### Acutezza decision and defensible construct

Acutezza is the suite's most ambitious and already deepest protocol. Its
calibrated, monocular Nitidezza task can defensibly report an experimental
uncrowded Landolt-gap threshold on one browser setup. It is not clinical visual
acuity. Contrasto can report a within-run cost under nominal rendered contrast;
it is not contrast sensitivity. The current Meridiani result is not defensible
as a stable orientation preference and should be suspended until redesigned.

### Acutezza audited baseline protocol and timing

Setup asks for adult/correction/eye state, card-size calibration against an
85.6 mm card, and three blind-spot sweeps. A 30–100 cm median with spread no more
than 20% is accepted. Manual distance is allowed and marked assumed. Contrast
starts at nominal 10%, retries at 20%, and is otherwise skipped.

Per eye:

- four successful Landolt practice responses;
- 18 scored Nitidezza responses and one easy control;
- when available, 18 scored Contrasto responses and one easy control; and
- 15 unordered Meridiani angle pairs at two scales, for 30 responses.

The second eye receives one distance recheck. A difference above 20% invalidates
the run, but a passing recheck is not stored or used to update the distance.

With contrast, the protocol is 72 responses per eye and 144 for both eyes.
Without contrast, it is 53 per eye and 106 for both. All are self-paced. The
current roughly eight-minute estimate is plausible, not a measured bound.

### Acutezza baseline completeness and protocol risks

The highest-priority finding is a null-model failure in Meridiani. The code
calls the result stable when its pairwise direction agrees sufficiently across
two scales, but the summary ignores the stated subpixel phase. Independent
200,000-run simulations found a false “stable” result rate of:

- 14.784% for uniform left/equal/right responses;
- 15.961% for binary left/right responses; and
- 16.054% for always-left responses.

This is a property of the schedule and gate, not evidence of perception. The
instrument should not produce a scored stable preference in its current form.

Other gaps:

- Controls are pooled across eyes and conditions with an allowed single miss.
  This means 3/4 passes in a two-eye contrast run, 1/2 passes in either a
  one-eye contrast or two-eye no-contrast run, and 0/1 passes for one eye
  without contrast.
- Manual distance can receive the strongest quality label even though it is
  assumed.
- The posterior 90% interval is conditional on the model and prior. It is not
  test–retest reliability and should not be printed to two decimal places.
- The actual linear contrast values are not retained.
- A passing second-eye distance recheck is neither stored nor applied.
- The contrast gate characterizes a rendered nominal level, not display
  luminance or clinical low-contrast sensitivity.

A clearer control rule is per eye and per condition: 2/2 coherent, 1/2 caution
and repeat, 0/2 unusable. Controls remain separate from threshold estimation.

### Acutezza references to correct and add

[Li et al.'s virtual chinrest](https://www.nature.com/articles/s41598-019-57204-1) is a
good component source for browser visual-angle calibration. It does not validate
Acutezza. ISO 8596 defines a distance, photopic acuity method and Landolt optotype;
Sense6 should cite it as a reference boundary, not imply compliance.

The
[FrACT 18-trial result](https://link.springer.com/article/10.1007/s00417-024-06638-z)
was published online in 2024 and in the 2025 journal issue. It is
condition-specific. World Health Organization visual-impairment material is
background rather than a method source. The current Serero reference is
mislabelled as an astigmatic-clock-dial method; replace it with an actual
[astigmatic dial and subjective-refraction procedure](https://www.ncbi.nlm.nih.gov/books/NBK589695/).

Add:

- [Carkeet et al.](https://pubmed.ncbi.nlm.nih.gov/34533231/) on optotype
  pixelation and Landolt rendering;
- [Schrauf and Stern](https://pubmed.ncbi.nlm.nih.gov/11165766/) on Landolt
  orientation effects;
- [Pointer](https://pubmed.ncbi.nlm.nih.gov/11453867/) and
  [Zeri et al.](https://pubmed.ncbi.nlm.nih.gov/28639086/) on low-contrast
  acuity and liquid-crystal-display contrast limitations;
- the 2023
  [systematic review of self-administered visual-acuity testing](https://pmc.ncbi.nlm.nih.gov/articles/PMC10286971/);
- the exact custom psychometric model, prior, guessing/lapse assumptions,
  stopping rule, and interval definition as a versioned method specification.

The urgent-care source must cover every symptom in the copy. NEI material about
new floaters, flashes, and a curtain does not by itself support sudden loss or
severe pain; add an authoritative source for those symptoms.

### Acutezza competitors and reusable work

WHOeyes, Peek Acuity, Visibly, and other governed visual services demonstrate
that exact-workflow validation, device restrictions, and operational controls
matter. Their claims do not transfer. Casual online charts are easier to start
but much weaker on scale/distance honesty. Sense6 leads many public comparators
on calibration visibility, privacy, uncertainty, and its nonclinical boundary.

| Project | Licence or access | Appropriate use |
| --- | --- | --- |
| [FrACT/FrACT10](https://github.com/michaelbach/FrACT10) | GPL-3.0 | Strong configurable/versioned protocol, simulation, export, and repeat-condition precedent; do not copy into MIT casually |
| [jsPsych virtual chinrest](https://www.jspsych.org/latest/plugins/virtual-chinrest/) | MIT | Calibration provenance, retry, and feedback UX |
| Li et al. virtual-chinrest repository | Source visible; no reusable licence confirmed | Inspect method; do not assume permission |
| Stanford Acuity algorithm | Public algorithm precedent; no reusable licence confirmed | Comparator only until licence is verified |

Even when code is reusable, a validated FrACT or virtual-chinrest component does
not validate the combined Sense6 workflow.

### Acutezza modes and backlog

- **Focused Sharpness:** four successful practice, 18 scored, and two controls
  per eye—24 interactions per eye, 48 for both.
- **Standard Sharpness + nominal contrast:** 44 interactions per eye, 88 for
  both, after repairing controls and provenance.
- **Experimental orientation add-on:** only after Meridiani redesign,
  simulation, and pilot evidence; never enabled merely by choosing “Deep.”
- **Repeatability:** rerun the same selected scope independently, preserve both,
  and show agreement.

P0: suspend Meridiani scoring; make controls per eye/condition; distinguish
measured from assumed calibration quality; store actual contrast and distance
recheck; reduce false precision; version the complete method.

P1: add a scope chooser, stronger pause/restart semantics, public schedule
invariants, compact calibration/quality provenance, and independent-repeat UX.

P2: simulate and pilot the frozen estimator, evaluate within-person agreement,
compare with suitable acuity tasks under declared display conditions, and only
then consider stronger threshold interpretation. Clinical validation remains
outside the product plan.

## Portfolio backlog

### P0: result integrity completed

1. Repair the Tetracromia outputs and stimulus lifecycle.
2. Fix Daltonia's pre-paint response race, luminance/provenance wording, bounds,
   and journal evidence.
3. Tighten Riflessi quality logic and remove psychometric overstatement.
4. Guarantee Udito controls, audibility prerequisites, and correct bounds and
   uncertainty.
5. Suspend Acutezza Meridiani scoring and repair per-condition controls and
   calibration provenance.
6. Add protocol identity fields and mark historical entries as their existing
   exploratory versions.
7. Fix the five setup-consent whitespace defects.

### P1: maintainable measurement foundations completed

1. Create the categorized canonical source ledger and generate every source
   surface from it.
2. Add explicit scope selection and independent-repeat UX where recommended.
3. Add production schedule invariants, P0 regression cases, and selected full
   Firefox/WebKit journeys without turning accelerated fixtures into public
   protocol substitutes.
4. Define a shared quality-evidence vocabulary while leaving each experiment's
   estimator and interpretation inside its domain module.
5. Measure completion, abandonment, interruption, and comprehension before
   promising new duration ranges. This remains future participant evidence and
   requires a separate consent and privacy decision.

### P2: evidence after protocols freeze

1. Simulate adaptive methods against declared observer models and failure modes.
2. Pilot instructions, accessibility, fatigue, practice, and lapse rules.
3. Measure within-session uncertainty and between-session agreement; use ICC or
   Bland–Altman methods where their assumptions fit.
4. Compare only the most valuable frozen instruments with appropriate external
   references and declared browser/display strata.
5. Validate any population interpretation before introducing norms, categories,
   screening, or clinical-sounding labels.

## Explicit non-goals

- Do not create a suite-wide score or leaderboard.
- Do not call a longer protocol more accurate until precision and repeatability
  demonstrate that claim.
- Do not hide a new construct inside a Deep mode of an existing result.
- Do not use open-source code, a standard, or a similar publication as shorthand
  for validation of the assembled Sense6 protocol.
- Do not collect identifiable raw participant records merely to make the product
  appear scientific.
- Do not migrate to TypeScript or a framework as part of this scientific tranche.
  The existing typed-JavaScript and domain-module architecture is adequate; the
  protocol, evidence, and runtime guards are the limiting foundations here.

## Owner decision checklist

The evidence supports these decisions now:

- [x] Approve the P0 integrity tranche across all five tests.
- [x] Approve protocol versioning and the canonical source ledger.
- [x] Approve scope selection and independent repeatability as the product model.
- [x] Defer the Tetracromia research-depth map and any new Daltonia ellipse.
- [x] Suspend Acutezza Meridiani scoring until a redesigned protocol survives
  null simulation and a pilot.
- [x] Keep participant/external validation optional and downstream of frozen
  protocols, consistent with the permanent recreational boundary.

## Remaining evidence gaps

This audit can identify code, protocol, reference, and interface problems. It
cannot establish how real participants understand the instructions, how long
they take, where they abandon, or how stable their results are. It also did not
commission a clinician, colour scientist, audiologist, optometrist, or
psychometrician to review the frozen protocols.

Those gaps do not block the P0 corrections. They do block claims about accuracy,
repeatability, screening performance, clinical meaning, or population norms.

## Report verification

The documentation gate passed Vale with no errors, Markdownlint, offline link
checking, and codespell. A separate online check resolved all 49 external links;
publisher sites that deliberately returned HTTP 403 were accepted only after
their canonical targets had been verified.

The application gate passed Biome, the 47-module strict typed-JavaScript
ratchet, TypeScript declaration checking, all 12 locale catalogs, 109 unit and
coverage tests, the production build, and 3 static-output tests. Combined
library coverage is 97.62% lines, 82.48% branches, and 94.34% functions.
Chromium, mobile Chromium, Chromium smoke, and Firefox produced 113 passing
browser tests with 35 intentional project-specific skips.

The complete `npm run check` could not launch its four WebKit journeys because
the GitOps-managed development host lacks WebKit's native GTK and GStreamer
libraries. Those cases failed before loading Sense6 or executing an
application assertion. WebKit remains a CI/preflight requirement; this report
does not mark it as locally verified.
