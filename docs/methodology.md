# Reproducing Sense6 methods
<!-- vale Vale.Spelling = NO -->

Lifecycle: current

This reference connects the Screen Colour Lab and Riflessi explanations to
their software methods. You can reproduce stimulus generation and result
calculations with synthetic inputs. That does not reproduce the light emitted
by a display, a physical response time, or a person's perception.

Sense6 is a recreational project, not a clinically validated instrument.
The [tetrachromacy guide](https://sense6.net/en/tetrachromacy-guide/) and
[reaction-time guide](https://sense6.net/en/reaction-time-guide/) explain the
research and interpretation boundaries for people trying the experiments.

## Identify the implementation

Record the full Git commit, Node.js version and protocol passport when citing
or checking a method. This reference was checked against
[source revision 1849053](https://github.com/Ponchia/sense6/tree/1849053661464d6c01393eb82d4d38df18cd44b6).
Use a commit permalink for a fixed citation; a branch URL can change.

After the [local setup](../CONTRIBUTING.md#set-up-a-checkout), run from the
repository root:

```sh
git rev-parse HEAD
node --version
node --input-type=module <<'JS'
import { protocolPassport } from './src/exams/protocols.js';
console.log(protocolPassport('tetracromia'));
for (const scope of ['signal', 'signal-choice', 'complete']) {
  console.log(protocolPassport('riflessi', scope));
}
JS
```

The [protocol source](../src/exams/protocols.js) owns these values:

<!-- markdownlint-disable MD013 -->

| Experiment | Method / stimulus version | Production schedule |
| --- | --- | --- |
| Screen Colour Lab | `screen-colour-lab-v2` / `oklch-screen-stimuli-v2` | 14 tile choices, 12 dot-field choices, 3 hue-ordering runs |
| Riflessi | `riflessi-v2` / `visual-response-v2` | Signal: 8 practice, 20 measured signals and 2 catches; choice: 8 practice and 32 measured; sustained response: 180 seconds |

<!-- markdownlint-enable MD013 -->

Riflessi's `signal` and `signal-choice` profiles omit later blocks; `complete`
includes all three. A scope therefore changes the comparison cohort.
`configDigest` is a declared schedule label, not a cryptographic checksum of
the source or proof of the runtime settings. Keep the Git revision as well.

## Check generation and summaries

Run the existing focused checks:

```sh
node --test tests/session.test.js tests/color.test.js tests/reflexes.test.js \
  tests/contracts.test.js tests/riflessi-results.test.js tests/journal.test.js
```

These tests use synthetic choices and times. Their exact expected values are
software fixtures, not measurements from participants.

| What you can check | Implementation and evidence |
| --- | --- |
| Seeded colour trials, adaptive steps and ordering | [Session model](../src/lib/session.js), [session tests](../tests/session.test.js) |
| Colour conversion and computed differences | [Colour model](../src/lib/color.js), [colour tests](../tests/color.test.js) |
| Signal/catch schedules, balanced choice sides and timing summaries | [Response model](../src/lib/reflexes.js), [response tests](../tests/reflexes.test.js) |
| Method identities, production doses and source roles | [Contract tests](../tests/contracts.test.js) |
| Stored-result validation and comparison rules | [Result tests](../tests/riflessi-results.test.js), [journal tests](../tests/journal.test.js) |

For a model reproduction, use the same seed, configuration and ordered input
sequence. `ColorLabSession` accepts a seed; the response schedule functions
accept a random source from [seededRandom](../src/lib/random.js). Adaptive
colour trials also depend on earlier choices. A seed alone cannot reconstruct
a person's run, and the journal export is not a full stimulus/response log.

The colour model summarizes recent reversals, or recent presented levels when
there are too few reversals, through `staircaseThreshold`. Despite that internal
function name, the short-run output is not an established perceptual threshold.
Ordering reports the percentage of correctly ordered pairs separately.

`summarizeRiflessi` uses finite times from correct responses for timing
statistics. It reports medians and median absolute deviations, with timing
summaries rounded to 5 milliseconds. Rounding is a display rule, not measured
timing accuracy. Counts of misses, anticipations, false starts, wrong choices
and catches remain necessary context. The choice-block difference is a
descriptive subtraction, not an isolated causal effect of decision-making.

## Keep the device uncertainty visible

In the [Riflessi controller](../src/exams/riflessi.js), `revealSignal` stores a
`requestAnimationFrame` timestamp while changing the visual state.
`handleResponse` subtracts it from `eventTimestamp`, which uses the event's
timestamp when plausible and otherwise falls back to `performance.now()`.
The [DOM timestamp definition](https://dom.spec.whatwg.org/#dom-event-timestamp)
concerns event creation. Neither endpoint measures physical display onset or
physical input contact. Frame-cadence and late-onset diagnostics do not provide
a device-latency correction. The reaction-time guide links the original
external-equipment timing studies; their results do not calibrate Sense6.

The [colour controller](../src/exams/tetracromia.js) renders computed colours.
[CSS Color 4](https://www.w3.org/TR/css-color-4/#color-difference-OK) defines
colour representations and differences; it does not measure this screen's
emitted spectrum. A reported gamut and a visible grayscale check do not
establish display calibration or evidence of tetrachromacy.

The [journal](../src/lib/journal.js) stores protocol, setup, quality evidence
and separate measurements. Its display passport records reported dimensions,
pixel ratio, viewport and gamut, not a unique physical monitor identity or a
brightness measurement. Record relevant setup changes yourself when repeating
locally. Matching passports do not prove identical physical conditions.
Different protocol fields prevent comparison; matching fields only satisfy
the software's compatibility rules. Keep personal exports private.

## Read citations by their role

The [evidence ledger](../src/exams/sources.js) distinguishes a method source,
an interpretation boundary, a related instrument and exact Sense6 validation.
Its validation lists are empty. A cited algorithm, timing study or established
instrument does not validate the assembled browser experiment.

Passing unit, browser or accessibility checks establishes the tested software
behavior. It does not establish clinical validity, population norms,
test-retest reliability, a biological trait or diagnostic accuracy. Sense6
does not combine these observations into an overall ability score.
