<!-- vale off -->
# Acutezza research and implementation brief
<!-- vale on -->
<!-- vale Vale.Spelling = NO -->

Status: proposed, 2026-07-19

Acutezza should be a calibrated browser sharpness experiment, not an online eye
exam. It should describe what a person resolved on one screen, at one estimated
distance, with one stated correction. It must not diagnose astigmatism, produce
a prescription, or classify vision as normal or abnormal.

This brief defines the evidence boundary and a protocol that fits Sensoria's
existing product contract. It does not claim that the resulting implementation
has clinical validity. That would require a separate validation study.

## Recommendation

Build Acutezza around a mandatory calibration gate and three monocular
instruments:

1. **Nitidezza** measures a high-contrast Landolt-ring gap threshold.
2. **Contrasto** repeats the threshold task at a nominal low contrast and reports
   the within-run contrast cost.
3. **Meridiani** checks whether clarity judgments show a repeatable orientation
   preference across stimulus sizes.

Use the product tagline **Calibrated sharpness and meridional clarity**. The
current roadmap phrase, **Visual acuity and astigmatism**, implies more clinical
authority than an unvalidated browser experiment has. Increase the expected
duration from about 2 minutes to about 7–9 minutes for a complete two-eye run.

The result should report angular gap thresholds, uncertainty, a contrast cost,
and meridional response consistency. Do not show Snellen fractions, clinical
logMAR labels, cylinder power, a prescription axis, pass or fail, population
percentiles, or reassurance that vision is normal.

Limit the initial release to adults aged 18 or older. Pediatric acuity and
crowding need a separate protocol, age-appropriate instructions, and their own
validation.

## Why calibration is the load-bearing constraint

Acuity is an angular measurement. A browser does not know the physical size of a
CSS pixel or the person's viewing distance. `devicePixelRatio` describes the
relationship between logical and backing pixels; it does not establish screen
millimetres. Rendering a familiar eye-chart symbol without both measurements
would create a precise-looking but meaningless result.

The proposed calibration follows the validated virtual-chinrest method:

- Ask the user to resize an on-screen rectangle to an ISO ID-1 bank or identity
  card, whose width is 85.60 mm. Tell them to use the blank side. The app reads
  no card details and uses no camera.
- Estimate viewing distance with three blind-spot sweeps while one eye fixates a
  marker. Use the median and reject inconsistent sweeps.
- Offer a ruler-measured distance as a fallback. Mark that run as
  `distance-assumed`, not `distance-measured`.

Li et al. validated this combination on 13-inch and 23-inch displays at 43, 53,
and 66 cm. The mean absolute distance error was 3.25 cm. They also reproduced a
visual-crowding experiment online after calibration. This supports browser
control of visual angle; it does not validate a clinical acuity result.

The blind-spot sweep needs enough physical screen width. After the card step,
calculate whether the required marker and target positions fit. Ask for landscape
orientation or a larger display when they do not. Do not silently substitute a
shorter distance on a narrow phone.

Lock the calibration after setup. Invalidate it if page zoom,
`visualViewport.scale`, backing-pixel ratio, orientation, fullscreen state, or
viewport geometry changes. Recheck viewing distance between eyes.

## Setup contract

Before calibration, ask the user to:

- use a stable laptop, tablet, or monitor at comfortable brightness, without
  glare or colour-altering display modes;
- reset browser zoom to its default level and avoid resizing or rotating the
  display;
- choose whether they are wearing no correction, glasses, or contact lenses;
- use their usual correction for the chosen near or intermediate distance;
- cover the other eye with an opaque card or occluder without pressing it; and
- stop if the task causes discomfort.

The protocol measures near or intermediate presenting sharpness at the calibrated
distance. It is not a 3 m or 6 m distance-acuity test. WHO guidance separates
distance testing from near testing and records correction state; Acutezza should
do the same in its summary.

The setup result should be one of:

- `measured`: card and blind-spot checks agree;
- `assumed`: card size is measured but viewing distance was entered manually;
- `invalid`: geometry changed, the checks were inconsistent, or the display
  cannot present the required range.

Only the first two states may start a measured run. An assumed run must retain a
visible caution label through the result.

## Instrument 1: Nitidezza

Use the Landolt ring because ISO 8596 specifies it as the standard optotype, and
because its eight orientations support a language-independent forced-choice
task with a 12.5% guessing rate.

Protocol per eye:

- Give four easy practice trials with feedback before measuring either eye.
- Present 18 measured trials with eight orientations in balanced random order.
- Do not give correctness feedback during measured trials.
- Add two easy task-control trials across the complete eye block. Keep controls
  out of threshold estimation.
- Let the person respond with a large eight-direction pad, arrow or diagonal
  keyboard shortcuts, or number keys.

Use a modified Best-PEST or equivalent Bayesian threshold estimator with an
explicit 1/8 guessing floor and a small lapse rate. FrACT research found that 18
eight-choice Landolt-ring trials are an efficient burden/precision compromise,
with test-retest limits of agreement of about ±0.17 logMAR under controlled
conditions. Acutezza must expose comparable uncertainty rather than present the
estimate as exact.

The ring has five geometric units across its outer diameter. Stroke width and gap
width are one unit. Convert the requested angular diameter to physical and logical
pixels from the calibration:

```text
diameter_mm = 2 × distance_mm × tan(diameter_radians / 2)
diameter_css_px = diameter_mm × css_pixels_per_mm
```

Render into a supersampled canvas and downsample once. Anti-aliasing is required
because threshold gaps can be smaller than one backing pixel. Record and enforce
the display's measurable floor instead of extrapolating past it.

## Instrument 2: Contrasto

Repeat the same 18-trial, eight-choice task at a fixed nominal low contrast,
interleaved with Nitidezza or run immediately after it for the same eye. Generate
the optotype and background from linear-light values, then encode them into sRGB.
Keep the surround constant.

The result is the log-size or percentage cost between the high- and low-contrast
thresholds for the same eye in the same run. It is not a clinical contrast
sensitivity score. Consumer display luminance, tone response, ambient light, and
glare are uncalibrated, so cross-device comparison is not justified.

Start with a nominal 10% Michelson contrast only if the setup grayscale check
confirms that the display preserves the required levels. Otherwise increase the
nominal contrast or mark this instrument unavailable. Store the actual linear
values used in the result.

## Instrument 3: Meridiani

A clinical astigmatic dial is part of subjective refraction. The person identifies
a clearer meridian while a clinician changes spherical and cylindrical lenses
until the lines appear equal. A browser has no trial lenses, cannot control
accommodation, and cannot infer cylinder power. Therefore, a bare clock dial is
not an astigmatism measurement.

Meridiani should instead measure a repeatable **orientation-dependent clarity
preference**:

- Test six undirected meridians from 0° through 150° in randomized pairwise
  comparisons.
- Repeat comparisons at two spatial scales near the person's measured threshold
  and with multiple subpixel phases.
- Supersample every line or grating so the screen's pixel grid does not create an
  obvious horizontal or vertical advantage.
- Run each eye separately with the head upright.
- Report a preferred meridian only when the same preference replicates across
  scale and phase with a prespecified consistency threshold. Otherwise report
  that no stable preference appeared.

The result may say, for example, “This eye judged the 60°/150° meridian pair
differently in 8 of 10 repeated comparisons.” It must not say “astigmatism at
60°,” infer the optical axis, or estimate dioptres. Orientation judgments can
also reflect display rasterization, correction, accommodation, tear film,
attention, or neural adaptation.

This instrument is exploratory. Keep the roadmap wording and result copy away
from an astigmatism-screening claim until a prospective comparison against
subjective refraction establishes what the signal means.

## Result contract

Keep the three measures separate. A result should contain:

- correction state and self-occlusion confirmation;
- screen scale, estimated or assumed distance, calibration repeatability, and
  any geometry changes;
- high-contrast angular gap threshold and uncertainty for each eye;
- low-contrast threshold and within-run contrast cost for each eye;
- meridional preference, consistency, and replication state for each eye;
- task-control performance and explicit floor or ceiling bounds; and
- a setup-quality stamp: coherent, interpret with caution, or unusable.

Use neutral language. Do not combine measures into a score. Do not compare users.
Store only the concise last-run summary in browser storage and upload nothing.

Required result disclaimer:

> Acutezza describes one self-administered run on this display at this estimated
> distance. It is not an eye examination, vision screening, diagnosis, or
> prescription. A calibrated clinical test can produce a different result.

Add an urgent-care note before and after the run: sudden loss or deterioration of
vision, severe eye pain, new flashes or floaters, or a curtain or shadow in the
visual field needs prompt professional assessment. The test must never delay
care.

## Browser and accessibility requirements

This task is inherently visual, but the surrounding interface must remain
accessible:

- provide keyboard and touch response paths with targets large enough to select
  without moving closer to inspect them;
- keep instructions and progress available to assistive technology;
- announce trial transitions without revealing the answer;
- provide a no-motion mode for the blind-spot sweep when manual distance is used;
- pause and invalidate the current trial when the tab loses visibility; and
- allow the person to stop between eye blocks without losing the completed eye.

Do not use webcam distance estimation in the first implementation. It adds camera
permission, privacy concerns, device-specific face geometry, and another
unvalidated estimator. Do not add a second-device remote until Sensoria has a
privacy-preserving connection design and a real need for clinical distance.

## Regulatory and product boundary

Product intent matters. EU Regulation 2017/745 includes software intended for
diagnosis, monitoring, prediction, treatment, or investigation of physiological
or pathological states in the medical-device definition. The current European
Commission software guidance should be reviewed before making medical claims.

The FDA previously warned Opternative for marketing an uncleared online
refraction examination. A later cleared web acuity product is limited to adults
aged 22–40, uses two devices at 10 feet, reports only two categories, and positions
the result as support for an eye-care provider. That comparison shows how much
validation and restriction sit behind even a narrow medical claim.

Sensoria should remain a general perception experiment. Avoid these words in
results and marketing: screening, normal vision, abnormal vision, 20/20, 6/6,
clinical logMAR, refractive error, myopia, hyperopia, astigmatism detected,
amblyopia, cylinder, prescription, pass, and fail.

This section records a product guardrail, not legal advice.

## Implementation shape

Add these components when implementation begins:

- `src/exams/acutezza.js`: intro, setup, calibration, eye blocks, result, cleanup,
  and copied summary;
- `src/lib/acuity.js`: calibration geometry, angular conversion, Bayesian
  estimator, trial schedules, quality rules, and result summaries;
- `src/lib/optotypes.js`: supersampled Landolt ring and meridional stimuli;
- `tests/acuity.test.js`: deterministic schedules, simulated threshold recovery,
  posterior bounds, calibration math, and floor/ceiling behavior;
- browser tests for zoom invalidation, visibility changes, keyboard/touch paths,
  small-screen refusal, both eye blocks, accessibility, and all six locales.

Register the exam only after it meets the acceptance gates. Until then, keep it
in the roadmap.

## Acceptance gates before release

1. Verify Landolt geometry and visual-angle conversion against independent
   calculations at several pixel densities and distances.
2. Recover known simulated thresholds without material bias across the supported
   range and expose a calibrated uncertainty interval.
3. Verify card calibration repeatability and blind-spot distance repeatability on
   phones, tablets, standard-density monitors, and high-density monitors.
4. Compare Nitidezza against FrACT at the same measured distance on multiple
   displays. Document mean bias and Bland–Altman limits rather than correlation
   alone.
5. Run test-retest sessions and confirm that 18 trials per condition provide an
   acceptable precision/burden tradeoff for Sensoria.
6. Treat Meridiani as qualitative until a preregistered comparison with clinical
   subjective refraction shows useful agreement.
7. Have an optometrist or ophthalmologist review the setup, safety copy, result
   language, and medical-device boundary before public release.

If these gates are not met, ship no acuity-shaped number. Keep the module as an
internal prototype or report only within-run task behavior.

## Evidence and sources

- [ISO 8596:2017](https://www.iso.org/standard/69042.html) specifies Landolt-ring
  optotypes and distance-acuity presentation. ISO confirmed the standard in
  2023.
- [ISO 10938:2016](https://www.iso.org/standard/63691.html) covers printed,
  projected, and electronic high-contrast optotype displays.
- [Li et al., virtual chinrest](https://www.nature.com/articles/s41598-019-57204-1)
  validates card-based screen scale and blind-spot viewing-distance estimation.
- [Bach, FrACT trial count](https://pmc.ncbi.nlm.nih.gov/articles/PMC11868300/)
  supports an 18-trial, eight-choice Landolt-ring compromise and quantifies its
  test-retest limits.
- [Bach, anti-aliasing and dithering](https://doi.org/10.1163/156856897X00087)
  explains why subpixel rendering is necessary for computer acuity targets.
- [Bastawrous et al., Peek Acuity](https://pubmed.ncbi.nlm.nih.gov/26022921/)
  validates a tumbling-E smartphone method under a controlled protocol.
- [Claessens et al., independent at-home web testing](https://formative.jmir.org/2023/1/e41045)
  reports a small mean bias but wide limits of agreement, from −0.21 to 0.26
  logMAR, and only 77% of eyes within 0.15 logMAR.
- [Bellsmith et al., three home tests](https://jamanetwork.com/journals/jamaophthalmology/fullarticle/2790590)
  finds systematic mean differences for printed, app, and website tests and
  calls for further validation.
- [WHO vision-assessment recommendations](https://iris.who.int/bitstream/handle/10665/68601/1/WHO_PBL_03.91.pdf)
  distinguish monocular and binocular, near and distance, and corrected and
  uncorrected measurements.
- [Serero et al., clock-dial procedure](https://www.nature.com/articles/s41598-023-35814-0.pdf)
  describes the dial as a clinician-led procedure that adds cylindrical lenses
  until meridians appear equal.
- [EU Medical Device Regulation 2017/745](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02017R0745-20230320)
  defines medical-device intent for software.
- [European Commission MDCG 2019-11 rev.1](https://health.ec.europa.eu/latest-updates/update-mdcg-2019-11-rev1-qualification-and-classification-software-regulation-eu-2017745-and-2025-06-17_en)
  is the current software qualification and classification guidance.
- [FDA Opternative warning](https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/opternative-inc-532477-10302017)
  documents the regulatory failure of an uncleared online refraction product.
- [FDA Visibly Digital Acuity clearance](https://www.accessdata.fda.gov/cdrh_docs/pdf22/K220090.pdf)
  documents the intended population, two-device protocol, output categories,
  and provider-support boundary of a cleared web product.
- [National Eye Institute urgent floater guidance](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/floaters)
  identifies sudden floaters, flashes, and curtain-like shadows as reasons for
  urgent assessment.
