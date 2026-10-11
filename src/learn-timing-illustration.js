/**
 * A deliberately hypothetical timing pipeline, never a calibration of Sense6
 * or a correction to a participant's reaction-time result.
 *
 * Keep the numerical example visible in static HTML when scripts are disabled.
 * Inputs only become active after the browser binds them on this Learn page.
 */
export const EXAMPLE_RESPONSE_MS = 220;

/** @param {number} displayDelay @param {number} inputDelay */
export function illustrativeInterval(displayDelay, inputDelay) {
  if (
    !Number.isInteger(displayDelay) ||
    !Number.isInteger(inputDelay) ||
    displayDelay < 0 ||
    displayDelay > 50 ||
    inputDelay < 0 ||
    inputDelay > 50
  ) {
    throw new RangeError('Illustrative delays must be whole milliseconds between 0 and 50');
  }
  return EXAMPLE_RESPONSE_MS + displayDelay + inputDelay;
}

/** Static, indexable and useful even without JavaScript. */
export function timingIllustrationMarkup() {
  return `<section class="learn-timing" data-learn-timing aria-labelledby="learn-timing-title">
    <header class="learn-timing__intro">
      <p class="ui-eyebrow">Interactive explanation · hypothetical values</p>
      <h2 id="learn-timing-title">What can be hiding inside a browser reaction time?</h2>
      <p>Imagine a person who responds in the same <strong>220 ms</strong> each time. Move the illustrative display and input delays to see how a browser-observed interval could differ even though that person's response stays unchanged.</p>
    </header>
    <div class="learn-timing__grid">
      <div class="learn-timing__inputs">
        <div class="learn-timing__fixed"><span>Fictional response</span><strong>220 ms</strong></div>
        <div class="learn-timing__control">
          <div class="learn-timing__label"><label for="learn-display-delay">Hypothetical display delay</label><output for="learn-display-delay" data-timing-display-output>16 ms</output></div>
          <input id="learn-display-delay" type="range" min="0" max="50" step="1" value="16" data-timing-display disabled>
          <p>Time between asking the browser to show a stimulus and the display actually showing it.</p>
        </div>
        <div class="learn-timing__control">
          <div class="learn-timing__label"><label for="learn-input-delay">Hypothetical input delay</label><output for="learn-input-delay" data-timing-input-output>12 ms</output></div>
          <input id="learn-input-delay" type="range" min="0" max="50" step="1" value="12" data-timing-input disabled>
          <p>Time between an action and its arrival at the browser event handler.</p>
        </div>
      </div>
      <figure class="learn-timing__result">
        <p class="ui-eyebrow">Illustrative interval</p>
        <output class="learn-timing__total" data-timing-total aria-live="polite" aria-atomic="true">248 ms</output>
        <meter min="0" max="320" value="248" data-timing-meter aria-label="Illustrative interval out of 320 milliseconds">248 of 320 milliseconds</meter>
        <dl>
          <div><dt>Fictional response</dt><dd>220 ms</dd></div>
          <div><dt>Display contribution</dt><dd data-timing-display-detail>16 ms</dd></div>
          <div><dt>Input contribution</dt><dd data-timing-input-detail>12 ms</dd></div>
        </dl>
        <figcaption>This is an arithmetic teaching example, <strong>not a latency measurement, calibration or correction formula</strong>. Browser scheduling, timestamps, display refresh and hardware processing vary in real life, sometimes differently from trial to trial.</figcaption>
      </figure>
    </div>
  </section>`;
}

/**
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function activateTimingIllustration(root) {
  const section = root.querySelector('[data-learn-timing]');
  if (!section) return () => {};
  const display = section.querySelector('[data-timing-display]');
  const input = section.querySelector('[data-timing-input]');
  const total = section.querySelector('[data-timing-total]');
  const meter = section.querySelector('[data-timing-meter]');
  const displayOutput = section.querySelector('[data-timing-display-output]');
  const inputOutput = section.querySelector('[data-timing-input-output]');
  const displayDetail = section.querySelector('[data-timing-display-detail]');
  const inputDetail = section.querySelector('[data-timing-input-detail]');
  if (!(display instanceof HTMLInputElement) || !(input instanceof HTMLInputElement)) {
    return () => {};
  }
  const update = () => {
    const displayMs = display.valueAsNumber;
    const inputMs = input.valueAsNumber;
    const value = illustrativeInterval(displayMs, inputMs);
    if (total) total.textContent = `${value} ms`;
    if (meter instanceof HTMLMeterElement) meter.value = value;
    if (displayOutput) displayOutput.textContent = `${displayMs} ms`;
    if (inputOutput) inputOutput.textContent = `${inputMs} ms`;
    if (displayDetail) displayDetail.textContent = `${displayMs} ms`;
    if (inputDetail) inputDetail.textContent = `${inputMs} ms`;
  };
  display.disabled = false;
  input.disabled = false;
  display.addEventListener('input', update);
  input.addEventListener('input', update);
  update();
  return () => {
    display.removeEventListener('input', update);
    input.removeEventListener('input', update);
  };
}
