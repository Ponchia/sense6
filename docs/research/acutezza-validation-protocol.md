<!-- vale off -->
# Acutezza external-validation protocol
<!-- vale on -->
<!-- vale Vale.Spelling = NO -->

Status: protocol and evidence tooling implemented; participant, FrACT, and
clinical-review evidence pending, 2026-07-19

Use this protocol to collect the physical-device and method-comparison evidence
that software tests cannot provide. It does not authorize a clinical claim.
Acutezza remains a self-administered, nonclinical angular-threshold experiment
until an appropriate prospective study, professional review, and regulatory
assessment support a narrower claim.

## Preconditions

Before you recruit or measure anyone:

1. Ask an optometrist or ophthalmologist and a statistician to review the study
   question, reference method, acceptable agreement limits, exclusion rules,
   and safety copy.
2. Determine whether ethics approval, informed consent, data-protection review,
   or study registration applies in the study location.
3. Prespecify the intended sample size from the required precision of the
   Bland–Altman limits of agreement. Do not choose a sample size only from a
   generic rule or stop when the result looks favorable.
4. Preregister the protocol, primary comparison, acceptable limits, exclusions,
   and subgroup analyses before looking at the paired results.
5. Keep participant data outside this repository. Use pseudonymous participant
   codes in the observation file and retain the reidentification key separately.

The [Standards for Reporting Diagnostic Accuracy Studies 2015
checklist](https://www.equator-network.org/reporting-guidelines/stard/) provides
the reporting baseline for a future diagnostic-accuracy claim. The current
study is a measurement-agreement study, so report the index and reference
methods, participant flow, missing and indeterminate results, adverse events,
precision, and generalizability even while the product remains nonclinical.

## Device matrix

Cover these physical display classes:

| Class | Required observations |
| --- | --- |
| Phone | At least one current phone with a high-density display |
| Tablet | At least one current device reviewed in portrait and landscape |
| Standard monitor | At least one approximately 1× desktop or laptop display |
| High-density monitor | One approximately 2× desktop or laptop display |

Across the matrix, include current Chromium, Firefox, and WebKit engines. Record
the exact browser version, operating system, display description, correction,
physical card calibration, viewing distance, and whether distance was measured
or manually entered. A virtual viewport or browser device emulation does not
satisfy this gate.

## Paired measurement procedure

Use the same correction, eye, measured distance, screen, ambient-light setup,
and posture for each paired observation.

1. Assign a pseudonymous participant code and device ID.
2. Counterbalance whether Acutezza or FrACT runs first. Record the assigned
   order before testing.
3. Run monocular Acutezza Nitidezza. Preserve the threshold, 90% interval,
   control performance, calibration method, and any display bound.
4. Run FrACT with the eight-orientation Landolt C at the same physical distance
   and with at least 18 trials. Record the FrACT version and logMAR result.
5. Repeat both methods after the prespecified rest interval. Keep same-session
   repeats separate from different-day repeats in the analysis.
6. Record interruptions, calibration failures, task-control failures, and
   withdrawals. Put incomplete observations in the evidence file's
   `exceptions` collection instead of inventing paired results or silently
   discarding them.
7. Stop testing if the participant reports discomfort or a concerning change in
   vision. Follow the safety and escalation process approved for the study.

The 18-trial FrACT minimum follows the current
[FrACT trial-count study](https://pubmed.ncbi.nlm.nih.gov/39294391/), which found
it to be a useful precision-and-burden compromise for an eight-choice Landolt C
task. This does not make FrACT and Acutezza interchangeable.

## Record observations

Copy the committed template to the ignored local path:

```sh
cp validation/acutezza/observations.template.json \
  validation/acutezza/observations.local.json
```

Use [protocol.schema.json](../../validation/acutezza/protocol.schema.json) as the
machine-readable contract. Validate and summarize the file:

```sh
node scripts/validate-acutezza-evidence.mjs \
  validation/acutezza/observations.local.json
```

When you believe every external gate is satisfied, run the stricter check:

```sh
node scripts/validate-acutezza-evidence.mjs \
  validation/acutezza/observations.local.json --require-evidence
```

The strict check requires the four device classes, all three browser engines,
paired repeats, at least 18 FrACT trials for every observation, and documented
professional acceptance of the nonclinical boundary. It verifies completeness,
not scientific validity.

## Analyze agreement and repeatability

Transform the Acutezza high-contrast gap threshold from arcminutes to a
logarithmic value with `log10(thresholdArcmin)`. Compare that value with the
FrACT logMAR result.

Report at minimum:

- mean paired bias and its confidence interval;
- lower and upper Bland–Altman limits of agreement with confidence intervals;
- the difference-versus-mean plot and any proportional bias or
  heteroscedasticity;
- Acutezza test-retest bias and limits separately from method agreement;
- counts and reasons for calibration failures, bounded estimates, task-control
  failures, missing values, and withdrawals; and
- prespecified results by device class, browser engine, and calibration method.

Correlation alone is not evidence of agreement. The included validator emits a
descriptive bias and limits summary for quality control. Use the prespecified
statistical method and confidence intervals for the study report. The
[exact interval and sample-size work by Jan and Shieh](https://pubmed.ncbi.nlm.nih.gov/30056297/)
is one source for planning the required precision.

## Professional review

Give the reviewer the live setup, safety copy, result copy, privacy notice,
comparison analysis, failure cases, and the complete
[Acutezza research brief](acutezza.md). Record requested changes and rerun the
affected verification. `accepted-nonclinical-boundary` means the reviewer
accepts the current experiment wording and safety boundary. It does not mean
that Acutezza is a medical device or a validated substitute for an eye
examination.

## Acceptance and claim boundary

The external gate is complete only when:

- the device matrix and browser coverage are physically observed;
- paired FrACT agreement and Acutezza repeatability are reported with precision;
- failures and bounded results remain in the evidence set;
- the prespecified acceptance limits are met;
- the professional review has no unresolved safety or claim-language issue; and
- legal or regulatory review approves any intended change in product purpose.

Until then, keep the current public wording: angular task thresholds from one
calibrated browser run, with no 20/20 label, screening result, diagnosis,
astigmatism detection, or prescription.
