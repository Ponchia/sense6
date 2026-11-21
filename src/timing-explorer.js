import { CREATOR_PROFILE_URL } from './site-identity.js';
import {
  compareTimingScenarios,
  defaultTimingConfiguration,
  REFRESH_RATES,
  TIMING_EXPLORER_ROUTE,
  timingConfigurationFromSearch,
  timingConfigurationLink,
} from './timing-explorer-model.js';

export { TIMING_EXPLORER_ROUTE };
export const TIMING_EXPLORER_METADATA = Object.freeze({
  title: 'Browser timing explorer — reaction time & device delay | Sense6',
  description:
    'Compare hypothetical reaction times across two setups. Explore display and input delays, calculate refresh intervals, and print a 20-minute learning activity.',
  socialImage: '/social/riflessi.png',
  socialImageAlt: 'Sense6 reaction timing experiment artwork',
  datePublished: '2026-11-21',
  dateModified: '2026-11-21',
});

/** Useful, complete teaching content before JavaScript runs. */
export function timingExplorerMarkup() {
  const configuration = defaultTimingConfiguration();
  return `<article class="timing-explorer ui-container ui-container--wide" data-sense6-view="timing-explorer" data-sense6-route="${TIMING_EXPLORER_ROUTE}" lang="en">
    <nav class="timing-explorer__breadcrumb" aria-label="Breadcrumb"><a data-sense6-route="" href="/en/">All experiments</a><span aria-hidden="true">/</span><a data-sense6-route="learn" href="/en/learn/">Learn</a><span aria-hidden="true">/</span><span aria-current="page">Browser timing explorer</span></nav>
    <header class="timing-explorer__hero">
      <p class="ui-eyebrow">Interactive explanation · hypothetical values</p>
      <h1>Browser timing explorer</h1>
      <p class="timing-explorer__lede">Can the same person get two different reaction times? Compare two fictional setups and see how the delays around a response can change the number.</p>
      <p class="timing-explorer__byline">By <a href="${CREATOR_PROFILE_URL}" rel="me noreferrer">Zeno</a> · Published <time datetime="2026-11-21">21 November 2026</time> · Available in English</p>
      <nav class="timing-explorer__jumps" aria-label="On this page"><a href="#timing-comparison">Compare scenarios</a><a href="#timing-activity">20-minute activity</a><a href="#timing-explanation">How the model works</a></nav>
    </header>
    <section class="timing-explorer__comparison" id="timing-comparison" aria-labelledby="timing-comparison-title">
      <div class="timing-explorer__heading"><div><p class="ui-eyebrow">One person, two assumed setups</p><h2 id="timing-comparison-title">Change the setup. Keep the response.</h2></div><p>Every value below is an assumption you choose. This page does not measure your device, time your reactions, or correct a real result.</p></div>
      <div class="timing-explorer__response">
        <div><label for="timing-response">Assumed person’s response, used in both scenarios</label><p id="timing-response-hint">The starting 220 ms is an invented example, not an average or a target.</p></div>
        <div><output for="timing-response" data-timing-value="response">220 ms</output><input id="timing-response" aria-describedby="timing-response-hint" data-timing-control="response" type="range" min="100" max="500" step="1" value="220" disabled></div>
      </div>
      <div class="timing-explorer__scenarios">${scenarioMarkup('a', configuration.a, 248)}${scenarioMarkup('b', configuration.b, 232)}</div>
      <div class="timing-explorer__difference"><p class="ui-eyebrow">What changed?</p><output data-timing-comparison aria-live="polite" aria-atomic="true">Scenario B is 16 ms shorter. The assumed person’s response is the same.</output><p>The difference comes entirely from the display and input values you chose.</p></div>
      <div class="timing-explorer__actions"><button class="ui-button" type="button" data-timing-share disabled>Copy example link</button><button class="ui-button ui-button--ghost" type="button" data-timing-reset disabled>Reset example</button><a class="ui-link" href="#timing-activity">Use the activity ↓</a></div>
      <p class="timing-explorer__share-note">A shared link contains only these fictional settings. It contains no experiment results or personal measurements.</p>
      <div class="timing-explorer__share-field" data-timing-share-field hidden><label for="timing-share-link">Link to this hypothetical example</label><input id="timing-share-link" class="ui-input" type="text" readonly data-timing-share-link></div>
      <p class="timing-explorer__status" role="status" aria-live="polite" data-timing-status></p>
      <noscript><p>JavaScript enables the controls and example links. The worked comparison, explanation and printable activity remain usable without it. You can print using your browser’s menu.</p></noscript>
    </section>
    ${activityMarkup()}
    <section class="timing-explorer__explanation" id="timing-explanation" aria-labelledby="timing-explanation-title">
      <h2 id="timing-explanation-title">What this model can explain</h2>
      <div class="timing-explorer__reading">
        <section><h3>Why do the numbers add up?</h3><p>This teaching example defines an interval from a request to show a stimulus until a response reaches the browser’s event handler. It adds three assumed parts: display contribution + person’s response + input contribution. The starting examples are 16 + 220 + 12 = 248 ms and 8 + 220 + 4 = 232 ms.</p><p>A real test’s timestamps, display pipeline, event handling and task design determine what its reported interval includes. These sliders do not estimate those parts for Riflessi or any other test. Subtracting invented delays from a measured result would not calibrate it.</p></section>
        <section><h3>Is a refresh interval the same as display delay?</h3><p>No. A rate of 60 Hz corresponds to 1000 ÷ 60 = 16.67 ms between refreshes; 120 Hz corresponds to 8.33 ms. The interval is arithmetic. It does not tell us when a particular stimulus becomes visible, how long pixels take to respond, or the full delay of a display.</p><p>Changing the refresh selector therefore changes only the interval shown beside it. It never adds an interval to the assumed display delay or silently replaces that delay. Browser animation callbacks are tied to repaint scheduling, but a callback is not a sensor measuring light from the screen. <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame" rel="noreferrer">Read the browser API explanation.</a></p></section>
        <section><h3>What can a real reaction-time test tell me?</h3><p>A browser task records responses under its own rules and your current setup. Repeating the same task with the same input method can be interesting, but a faster number on another device cannot by itself establish a faster person. Human variation, practice, fatigue and changes in the task also matter.</p><p><a data-sense6-route="reaction-time-guide" href="/en/reaction-time-guide/">Read the reaction-time guide and its research sources</a> for the distinction between software timing and an instrument-calibrated measurement. <a href="https://web.dev/articles/optimize-input-delay" rel="noreferrer">Google’s input-delay explanation</a> describes why an action can wait before its event callback runs.</p></section>
      </div>
      <p class="timing-explorer__boundary">Sense6 is a recreational browser lab. This explorer is an arithmetic teaching aid; it is not a device benchmark, clinical test or validation of the Sense6 experiments.</p>
      <div class="timing-explorer__actions"><a class="ui-button" href="/en/riflessi/?scope=signal">Try the short reaction task →</a><a class="ui-link" data-sense6-route="reaction-time-guide" href="/en/reaction-time-guide/">Understand a browser reaction time →</a></div>
      <p>The short task opens its normal preparation screen. It starts only when you choose to begin.</p>
    </section>
  </article>`;
}

function scenarioMarkup(id, scenario, total) {
  const label = id.toUpperCase();
  return `<section class="timing-explorer__scenario" aria-labelledby="timing-${id}-title"><h3 id="timing-${id}-title">Scenario ${label}</h3><p class="timing-explorer__total-label">Illustrative interval</p><output class="timing-explorer__total" data-timing-total="${id}">${total} <span>ms</span></output>
    <div class="timing-explorer__bar" aria-hidden="true"><span data-timing-bar="${id}-display" class="timing-explorer__bar-display" style="inline-size:${(scenario.display / 700) * 100}%"></span><span data-timing-bar="${id}-response" class="timing-explorer__bar-response" style="inline-size:${(220 / 700) * 100}%"></span><span data-timing-bar="${id}-input" class="timing-explorer__bar-input" style="inline-size:${(scenario.input / 700) * 100}%"></span></div>
    <p class="timing-explorer__equation" data-timing-equation="${id}">${scenario.display} display + 220 response + ${scenario.input} input = ${total} ms</p>
    ${delayControl(id, 'display', scenario.display, 'Assumed display contribution', 'Request to show the stimulus → stimulus visible.')}
    ${delayControl(id, 'input', scenario.input, 'Assumed input contribution', 'Action → arrival at the browser event handler.')}
    <div class="timing-explorer__refresh"><label for="timing-${id}-hz">Assumed refresh rate</label><select id="timing-${id}-hz" class="ui-input" data-timing-control="${id}-hz" aria-describedby="timing-${id}-refresh-note" disabled>${REFRESH_RATES.map((hz) => `<option value="${hz}"${hz === scenario.hz ? ' selected' : ''}>${hz} Hz</option>`).join('')}</select><output for="timing-${id}-hz" data-timing-refresh="${id}">1000 ÷ ${scenario.hz} = ${(1000 / scenario.hz).toFixed(2)} ms between refreshes</output><p id="timing-${id}-refresh-note">Shown separately. A refresh interval is not a measured display delay and is not added to the total.</p></div></section>`;
}

function delayControl(id, property, value, label, hint) {
  return `<div class="timing-explorer__control"><div><label for="timing-${id}-${property}">${label}</label><output for="timing-${id}-${property}" data-timing-value="${id}-${property}">${value} ms</output></div><input id="timing-${id}-${property}" aria-describedby="timing-${id}-${property}-hint" data-timing-control="${id}-${property}" type="range" min="0" max="100" step="1" value="${value}" disabled><p id="timing-${id}-${property}-hint">${hint}</p></div>`;
}

function activityMarkup() {
  return `<section class="timing-explorer__activity" id="timing-activity" aria-labelledby="timing-activity-title">
    <div class="timing-explorer__heading"><div><p class="ui-eyebrow">Sense6 · 20-minute activity · solo or in a group</p><h2 id="timing-activity-title">Does a faster number mean a faster person?</h2></div><button class="ui-button ui-button--ghost" type="button" data-timing-print disabled>Print activity</button></div>
    <p>Use the fictional examples to explore a fair comparison. All you need is this page, a pencil and paper. The simulation-only path takes about 20 minutes; no one needs to take a test or share a personal result.</p>
    <ol class="timing-explorer__steps"><li><strong>Predict · 3 minutes.</strong> Keep the assumed person’s response the same in A and B. Which interval will be shorter? Name the input you think explains the difference.</li><li><strong>Explore · 5 minutes.</strong> Start with the two example rows below. Change only B’s input contribution, keeping its display contribution and the common response fixed. Record two examples. Can you make B equal A?</li><li><strong>Separate the ideas · 5 minutes.</strong> Restore the initial delays. Change only a refresh-rate selector from 60 to 120 Hz. The interval between refreshes halves, while the illustrative reaction total stays unchanged. Explain why a refresh interval is not a complete latency measurement.</li><li><strong>Discuss · 7 minutes.</strong> What stayed constant? What did you assume rather than measure? What would you need to measure before attributing a difference between two devices to the person?</li></ol>
    <div class="timing-explorer__worksheet"><table><caption>Hypothetical observations — the first two rows follow the controls above</caption><thead><tr><th scope="col">Example</th><th scope="col">Person (ms)</th><th scope="col">Display (ms)</th><th scope="col">Input (ms)</th><th scope="col">Total (ms)</th></tr></thead><tbody><tr><th scope="row">A</th><td data-timing-sheet="a-response">220</td><td data-timing-sheet="a-display">16</td><td data-timing-sheet="a-input">12</td><td data-timing-sheet="a-total">248</td></tr><tr><th scope="row">B</th><td data-timing-sheet="b-response">220</td><td data-timing-sheet="b-display">8</td><td data-timing-sheet="b-input">4</td><td data-timing-sheet="b-total">232</td></tr><tr><th scope="row">Change 1</th><td>_____</td><td>_____</td><td>_____</td><td>_____</td></tr><tr><th scope="row">Change 2</th><td>_____</td><td>_____</td><td>_____</td><td>_____</td></tr></tbody></table></div>
    <p class="timing-explorer__prompt"><strong>Our explanation:</strong> A different number can result from <span aria-hidden="true">________________________________________________</span></p>
    <p><strong>Optional extension:</strong> Try <a href="/en/riflessi/?scope=signal">Riflessi’s short reaction task</a> using its normal preparation. Keep results private. Discuss what the task records and what remains unknown; do not rank people or “correct” their results using these sliders.</p>
    <p class="timing-explorer__activity-note">Teaching model: assumed display contribution + assumed person’s response + assumed input contribution. Refresh intervals are separate. None of these settings measures a real device. This activity has not been evaluated as a classroom teaching intervention.</p>
    <p class="timing-explorer__print-source">Activity and sources: sense6.net/en/browser-timing-explorer/ · Published 21 November 2026 · Sense6 is a recreational browser lab.</p>
  </section>`;
}

/**
 * @param {{app: HTMLElement, search?: string}} context
 * @returns {() => void}
 */
export function mountTimingExplorer({ app, search = window.location.search }) {
  if (!app.querySelector(':scope > [data-sense6-view="timing-explorer"]')) {
    app.innerHTML = timingExplorerMarkup();
  }
  const root = app.querySelector('[data-sense6-view="timing-explorer"]');
  if (!(root instanceof HTMLElement)) return () => {};
  const owner = new AbortController();
  const { signal } = owner;
  const parsed = timingConfigurationFromSearch(search);
  let configuration = parsed.configuration;
  let revision = 0;
  const status = root.querySelector('[data-timing-status]');
  const shareField = root.querySelector('[data-timing-share-field]');
  const shareInput = root.querySelector('[data-timing-share-link]');
  const say = (message) => {
    if (!signal.aborted && status) status.textContent = message;
  };
  const update = () => {
    revision += 1;
    updateTimingOutputs(root, configuration);
    if (shareField instanceof HTMLElement) shareField.hidden = true;
    if (shareInput instanceof HTMLInputElement) shareInput.value = '';
    say('');
  };
  writeTimingControls(root, configuration);
  update();
  if (parsed.state === 'invalid')
    say('This example link has invalid or incomplete settings. The default example is shown.');
  if (parsed.state === 'shared')
    say('Shared hypothetical example loaded. These settings are assumptions, not measurements.');
  for (const control of root.querySelectorAll('[data-timing-control]')) {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) continue;
    control.disabled = false;
    control.addEventListener(
      control instanceof HTMLSelectElement ? 'change' : 'input',
      () => {
        configuration = readTimingControls(root);
        update();
      },
      { signal },
    );
  }
  activateButton(
    root,
    '[data-timing-reset]',
    () => {
      configuration = defaultTimingConfiguration();
      writeTimingControls(root, configuration);
      update();
      say('Default example restored.');
    },
    signal,
  );
  activateButton(root, '[data-timing-print]', () => window.print(), signal);
  activateButton(
    root,
    '[data-timing-share]',
    async () => {
      const actionRevision = ++revision;
      const link = timingConfigurationLink(configuration);
      if (shareField instanceof HTMLElement) shareField.hidden = false;
      if (shareInput instanceof HTMLInputElement) shareInput.value = link;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(link);
        if (actionRevision === revision)
          say('Example link copied. It contains only the fictional settings shown here.');
      } catch {
        if (signal.aborted || actionRevision !== revision) return;
        if (shareInput instanceof HTMLInputElement) {
          shareInput.focus();
          shareInput.select();
        }
        say('The link is ready in the field above. Select and copy it to share this example.');
      }
    },
    signal,
  );
  return () => owner.abort();
}

function activateButton(root, selector, callback, signal) {
  const button = root.querySelector(selector);
  if (!(button instanceof HTMLButtonElement)) return;
  button.disabled = false;
  button.addEventListener('click', callback, { signal });
}

function writeTimingControls(root, configuration) {
  const values = {
    response: configuration.response,
    'a-display': configuration.a.display,
    'a-input': configuration.a.input,
    'a-hz': configuration.a.hz,
    'b-display': configuration.b.display,
    'b-input': configuration.b.input,
    'b-hz': configuration.b.hz,
  };
  for (const [name, value] of Object.entries(values)) {
    const input = root.querySelector(`[data-timing-control="${name}"]`);
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) input.value = String(value);
  }
}

function readTimingControls(root) {
  const read = (name) => Number(root.querySelector(`[data-timing-control="${name}"]`).value);
  return {
    response: read('response'),
    a: { display: read('a-display'), input: read('a-input'), hz: read('a-hz') },
    b: { display: read('b-display'), input: read('b-input'), hz: read('b-hz') },
  };
}

function updateTimingOutputs(root, configuration) {
  const result = compareTimingScenarios(configuration);
  const text = (selector, value) => {
    const node = root.querySelector(selector);
    if (node) node.textContent = value;
  };
  text('[data-timing-value="response"]', `${configuration.response} ms`);
  for (const id of ['a', 'b']) {
    const scenario = configuration[id];
    const total = id === 'a' ? result.intervalA : result.intervalB;
    const refresh = id === 'a' ? result.refreshA : result.refreshB;
    text(`[data-timing-total="${id}"]`, `${total} ms`);
    text(
      `[data-timing-equation="${id}"]`,
      `${scenario.display} display + ${configuration.response} response + ${scenario.input} input = ${total} ms`,
    );
    text(`[data-timing-value="${id}-display"]`, `${scenario.display} ms`);
    text(`[data-timing-value="${id}-input"]`, `${scenario.input} ms`);
    text(
      `[data-timing-refresh="${id}"]`,
      `1000 ÷ ${scenario.hz} = ${refresh.toFixed(2)} ms between refreshes`,
    );
    for (const [part, value] of Object.entries({
      response: configuration.response,
      display: scenario.display,
      input: scenario.input,
    })) {
      text(`[data-timing-sheet="${id}-${part}"]`, String(value));
      const bar = root.querySelector(`[data-timing-bar="${id}-${part}"]`);
      if (bar instanceof HTMLElement) bar.style.inlineSize = `${(value / 700) * 100}%`;
    }
    text(`[data-timing-sheet="${id}-total"]`, String(total));
  }
  text(
    '[data-timing-comparison]',
    result.difference === 0
      ? 'Both illustrative intervals are equal. The assumed person’s response is the same.'
      : `Scenario B is ${Math.abs(result.difference)} ms ${result.difference < 0 ? 'shorter' : 'longer'}. The assumed person’s response is the same.`,
  );
}
