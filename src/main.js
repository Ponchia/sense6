import '@ponchia/ui';
import { initThemeToggle, toast } from '@ponchia/ui/behaviors';
import './styles.css';

import { toRgbCss } from './lib/color.js';
import { seededRandom } from './lib/random.js';
import { ColorLabSession, PHASES } from './lib/session.js';

const app = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const gamutChip = document.querySelector('#gamut-chip');

let session = null;
let labActive = false;
let trialStartedAt = 0;
let selectedSequenceIndex = null;
let draggedSequenceIndex = null;

const stopTheme = initThemeToggle();
window.addEventListener('beforeunload', stopTheme);

detectDisplay();
renderHome();

function detectDisplay() {
  const p3 = window.matchMedia?.('(color-gamut: p3)').matches;
  const srgb = window.matchMedia?.('(color-gamut: srgb)').matches;
  gamutChip.textContent = p3 ? 'P3 reported' : srgb ? 'sRGB reported' : 'Color gamut unknown';
  gamutChip.dataset.gamut = p3 ? 'p3' : srgb ? 'srgb' : 'unknown';
}

function renderHome() {
  session = null;
  labActive = false;
  selectedSequenceIndex = null;
  document.body.classList.remove('lab-mode');
  document.title = 'Tetracromia — Color perception lab';

  const spectrumBars = Array.from({ length: 28 }, (_, index) => {
    const hue = Math.round((index / 28) * 360);
    return `<span style="--bar-color: ${toRgbCss(0.7, 0.13, hue)}; --bar-delay: ${index * 18}ms"></span>`;
  }).join('');

  app.innerHTML = `
    <section class="hero ui-container ui-container--wide" id="top">
      <div class="hero__copy">
        <p class="ui-eyebrow">Color perception / 03 instruments / about 4 minutes</p>
        <h1>How finely do you <em>see</em> color?</h1>
        <p class="hero__lede">
          A careful, adaptive lab for the differences your display can reproduce—and your eyes can resolve.
        </p>
        <div class="ui-cluster hero__actions">
          <button class="ui-button ui-button--lg" type="button" data-action="setup">
            Begin the color lab <span aria-hidden="true">→</span>
          </button>
          <a class="ui-link ui-link--cta" href="#method">See the method</a>
        </div>
        <p class="hero__limit">
          <span aria-hidden="true">◇</span>
          This is not a medical test and cannot confirm tetrachromacy.
        </p>
      </div>

      <div class="hero__instrument" aria-hidden="true">
        <div class="color-orbit color-orbit--outer"></div>
        <div class="color-orbit color-orbit--middle"></div>
        <div class="color-orbit color-orbit--inner"></div>
        <div class="instrument-core">
          <span>Δ</span>
          <strong>E<sub>OK</sub></strong>
          <small>display relative</small>
        </div>
        <p class="instrument-note instrument-note--one">Hue</p>
        <p class="instrument-note instrument-note--two">Field</p>
        <p class="instrument-note instrument-note--three">Order</p>
      </div>
    </section>

    <div class="spectrum" aria-hidden="true">${spectrumBars}</div>

    <section class="ui-container ui-container--wide section" id="lab">
      <div class="section-heading">
        <div>
          <p class="ui-eyebrow">The lab</p>
          <h2>Three views of discrimination.</h2>
        </div>
        <p>No names, no account, no upload. Your session stays in this browser.</p>
      </div>

      <div class="test-index">
        ${PHASES.map(
          (phase, index) => `
            <article class="test-card">
              <div class="test-card__visual test-card__visual--${phase.id}" aria-hidden="true">
                ${testCardVisual(phase.id)}
              </div>
              <div class="test-card__body">
                <div class="ui-cluster ui-cluster--between">
                  <span class="test-card__number">${phase.number}</span>
                  <span class="ui-tag">${index === 2 ? '3 runs' : `${phase.trials} trials`}</span>
                </div>
                <h3>${phase.name}</h3>
                <p>${testDescription(phase.id)}</p>
              </div>
            </article>
          `,
        ).join('')}
      </div>
    </section>

    <section class="method section" id="method">
      <div class="ui-container ui-container--wide method__layout">
        <div class="method__intro">
          <p class="ui-eyebrow">Method, not magic</p>
          <h2>The difference gets smaller as you succeed.</h2>
          <p>
            Threshold and Field use a two-correct-down, one-error-up staircase. It spends more
            trials near your current boundary instead of asking the same easy question repeatedly.
          </p>
        </div>
        <ol class="method-steps">
          <li>
            <span>1</span>
            <div><strong>Neutral surround</strong><p>Stimuli sit on the same middle-gray chamber in either theme.</p></div>
          </li>
          <li>
            <span>2</span>
            <div><strong>Perceptual spacing</strong><p>Colors are generated in OKLCH and mapped safely into sRGB.</p></div>
          </li>
          <li>
            <span>3</span>
            <div><strong>Adaptive estimate</strong><p>Reversals around the boundary produce a session-relative threshold.</p></div>
          </li>
          <li>
            <span>4</span>
            <div><strong>Honest result</strong><p>Your profile describes this screen, light, fatigue level, and run.</p></div>
          </li>
        </ol>
      </div>
    </section>

    <section class="ui-container ui-container--wide section science" id="science">
      <div class="science__statement">
        <p class="ui-eyebrow">The fourth-cone question</p>
        <h2>An RGB screen cannot test tetrachromacy.</h2>
        <p>
          Consumer displays mix three primaries. Confirming functional tetrachromacy requires
          spectral stimuli that can separate a fourth response, specialized hardware, genetics,
          and controlled conditions. Tetracromia measures ordinary on-screen color discrimination
          instead—and says exactly that.
        </p>
      </div>
      <div class="science__sources ui-card">
        <p class="ui-eyebrow ui-eyebrow--muted">Research trail</p>
        <ul class="source-list">
          <li>
            <a href="https://doi.org/10.1167/10.8.12" rel="noreferrer">
              Jordan et al. (2010), functional tetrachromacy
            </a>
          </li>
          <li>
            <a href="https://www.xrite.com/visual-assessment-tools/fm-100-hue-test" rel="noreferrer">
              Farnsworth–Munsell 100 Hue method
            </a>
          </li>
          <li>
            <a href="https://www.w3.org/TR/css-color-4/#ok-lab" rel="noreferrer">
              W3C OKLab / OKLCH color model
            </a>
          </li>
          <li>
            <a href="https://my.clevelandclinic.org/health/articles/tetrachromacy" rel="noreferrer">
              Clinical limits of online tetrachromacy tests
            </a>
          </li>
        </ul>
      </div>
    </section>

    <section class="closing-cta ui-container ui-container--wide">
      <div>
        <p class="ui-eyebrow">Ready when your screen is</p>
        <h2>Find your visible boundary.</h2>
      </div>
      <button class="ui-button ui-button--lg" type="button" data-action="setup">
        Start the lab <span aria-hidden="true">→</span>
      </button>
    </section>
  `;
}

function testCardVisual(id) {
  if (id === 'threshold') {
    return Array.from(
      { length: 16 },
      (_, index) => `<i class="${index === 10 ? 'is-shifted' : ''}"></i>`,
    ).join('');
  }
  if (id === 'field') {
    return Array.from(
      { length: 46 },
      (_, index) =>
        `<i style="--x:${(index * 37) % 100}%;--y:${(index * 61) % 100}%;--s:${4 + (index % 5)}px"></i>`,
    ).join('');
  }
  return Array.from({ length: 9 }, (_, index) => `<i style="--i:${index};--offset:${index % 3}"></i>`).join(
    '',
  );
}

function testDescription(id) {
  if (id === 'threshold')
    return 'Pick the one tile whose hue is different. The offset adapts after every answer.';
  if (id === 'field') return 'Find the shifted quadrant through controlled lightness and dot-size noise.';
  return 'Arrange three short hue arcs between fixed endpoints, with no color names as clues.';
}

function renderSetup() {
  document.body.classList.add('lab-mode');
  document.title = 'Prepare your screen — Tetracromia';
  window.scrollTo({ top: 0, behavior: 'instant' });

  app.innerHTML = `
    <section class="setup-view ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="home"><span aria-hidden="true">←</span> Leave lab</button>
      <div class="setup-grid">
        <div class="setup-copy">
          <p class="ui-eyebrow">Screen check / 01 of 01</p>
          <h1>Set the room before the score.</h1>
          <p class="setup-lede">
            Display settings and ambient light can move a color threshold. This one-minute check
            makes your run more repeatable.
          </p>
          <div class="ui-alert ui-alert--info forced-colors-warning">
            <div class="ui-alert__body">
              <strong class="ui-alert__title">Color override detected</strong>
              <p>Turn off forced-colors or high-contrast mode before a visual color task.</p>
            </div>
          </div>
          <ol class="setup-list">
            <li><span>1</span><p>Use one screen. Disable Night Shift, True Tone, blue-light filters, and vivid modes.</p></li>
            <li><span>2</span><p>Avoid direct glare. Let your eyes settle on the neutral page for about 30 seconds.</p></li>
            <li><span>3</span><p>Set comfortable brightness. You should distinguish every neighboring step below.</p></li>
          </ol>
        </div>

        <div class="setup-panel ui-card">
          <div class="ui-card__head">
            <div>
              <p class="ui-eyebrow ui-eyebrow--muted">Black → white</p>
              <h2>11-step check</h2>
            </div>
            <span class="ui-badge ui-badge--muted">${gamutChip.textContent}</span>
          </div>
          <div class="calibration-steps" aria-label="Eleven brightness steps from black to white">
            ${Array.from({ length: 11 }, (_, index) => `<span style="--step:${index / 10}"><b>${index}</b></span>`).join('')}
          </div>
          <div class="calibration-gradient" aria-label="Continuous grayscale gradient"></div>
          <p class="calibration-hint">Look for distinct edges above and a smooth ramp here—without a bright hotspot.</p>
          <label class="ui-check ready-check">
            <input type="checkbox" id="screen-ready" />
            <span>I can distinguish the steps and my color-shifting filters are off.</span>
          </label>
          <button class="ui-button ui-button--lg" id="start-lab" type="button" data-action="start" disabled>
            Start instrument 01 <span aria-hidden="true">→</span>
          </button>
          <p class="privacy-note"><span aria-hidden="true">⌁</span> Results are calculated locally and are not uploaded.</p>
        </div>
      </div>
    </section>
  `;
}

function startLab() {
  const seed = `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
  session = new ColorLabSession(seed);
  labActive = true;
  selectedSequenceIndex = null;
  document.body.classList.add('lab-mode');
  trialStartedAt = performance.now();
  renderLab();
  announce('Instrument one. Threshold. Find the different tile.');
}

function renderLab() {
  if (!session) return;
  const phase = session.phase;
  const phaseProgress = Math.round((session.trialIndex / phase.trials) * 100);
  const trial = session.currentTrial;
  document.title = `${phase.name} ${session.trialIndex + 1} of ${phase.trials} — Tetracromia`;

  app.innerHTML = `
    <section class="lab-view">
      <div class="lab-topbar ui-container ui-container--wide">
        <button class="back-link" type="button" data-action="home"><span aria-hidden="true">×</span> End session</button>
        <ol class="phase-list" aria-label="Lab progress">
          ${PHASES.map((item, index) => {
            const status =
              index < session.phaseIndex ? 'complete' : index === session.phaseIndex ? 'current' : 'upcoming';
            return `<li data-status="${status}" ${status === 'current' ? 'aria-current="step"' : ''}>
              <span>${item.number}</span><strong>${item.name}</strong>
            </li>`;
          }).join('')}
        </ol>
        <span class="trial-count"><b>${String(session.trialIndex + 1).padStart(2, '0')}</b> / ${String(phase.trials).padStart(2, '0')}</span>
      </div>

      <div
        class="ui-progress lab-progress"
        role="progressbar"
        aria-label="Current instrument progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="${phaseProgress}"
      >
        <div class="ui-progress__bar" style="--value:${phaseProgress}"></div>
      </div>

      <div class="lab-stage ui-container">
        <header class="trial-heading">
          <p class="ui-eyebrow">Instrument ${phase.number} / ${phase.name}</p>
          <h1>${phasePrompt(phase.id)}</h1>
          <p>${phaseHelp(phase.id)}</p>
        </header>

        ${trial.kind === 'threshold' ? renderThreshold(trial) : ''}
        ${trial.kind === 'field' ? renderField(trial) : ''}
        ${trial.kind === 'sequence' ? renderSequence(trial) : ''}

        <div class="trial-meta">
          <span><i aria-hidden="true"></i> Neutral surround</span>
          <span>Adaptive difficulty</span>
          <span>No answer is stored online</span>
        </div>
      </div>
    </section>
  `;

  if (trial.kind === 'field') requestAnimationFrame(() => drawFields(trial));
}

function phasePrompt(id) {
  if (id === 'threshold') return 'Which tile is different?';
  if (id === 'field') return 'Which field shifts in color?';
  return 'Build the smoothest color path.';
}

function phaseHelp(id) {
  if (id === 'threshold') return 'Choose once. Trust the first stable difference you see.';
  if (id === 'field') return 'Ignore dot size and brightness. Look for a whole-field hue shift.';
  return 'The endpoints are fixed. Select two tiles to swap them, or use the arrow controls.';
}

function renderThreshold(trial) {
  return `
    <div class="test-chamber threshold-chamber">
      <div class="threshold-grid" role="group" aria-label="Sixteen color tiles">
        ${Array.from({ length: 16 }, (_, index) => {
          const color = index === trial.answer ? trial.target : trial.reference;
          return `<button
            class="color-tile"
            type="button"
            data-choice="${index}"
            aria-label="Color tile ${index + 1}"
            style="--tile-color:${toRgbCss(color.l, color.c, color.h)}"
          ></button>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderField() {
  return `
    <div class="test-chamber field-chamber">
      <div class="field-grid" role="group" aria-label="Four dotted color fields">
        ${Array.from(
          { length: 4 },
          (_, index) => `
          <button class="field-choice" type="button" data-choice="${index}" aria-label="Dotted field ${index + 1}">
            <canvas data-field="${index}" aria-hidden="true"></canvas>
            <span aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          </button>
        `,
        ).join('')}
      </div>
    </div>
  `;
}

function drawFields(trial) {
  document.querySelectorAll('canvas[data-field]').forEach((canvas) => {
    const index = Number(canvas.dataset.field);
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    context.fillStyle = '#747472';
    context.fillRect(0, 0, bounds.width, bounds.height);

    const random = seededRandom(`${trial.nonce}:${index}`);
    const base = index === trial.answer ? trial.target : trial.reference;
    const count = Math.round((bounds.width * bounds.height) / 145);

    for (let dot = 0; dot < count; dot += 1) {
      const lightness = base.l + (random() - 0.5) * 0.105;
      const chroma = Math.max(0.035, base.c + (random() - 0.5) * 0.036);
      const hue = base.h + (random() - 0.5) * 4.5;
      const radius = 2.2 + random() * 4.8;
      const x = radius + random() * (bounds.width - radius * 2);
      const y = radius + random() * (bounds.height - radius * 2);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = toRgbCss(lightness, chroma, hue);
      context.fill();
    }
  });
}

function renderSequence(trial) {
  const first = trial.colors[0];
  const last = trial.colors.at(-1);

  return `
    <div class="test-chamber sequence-chamber">
      <div class="sequence-track" role="group" aria-label="Hue ordering track">
        ${sequenceAnchor(first, 'Start anchor')}
        <div class="sequence-run" id="sequence-run">
          ${trial.order
            .map((colorIndex, position) => {
              const color = trial.colors[colorIndex];
              const selected = selectedSequenceIndex === position;
              return `<button
              class="sequence-tile ${selected ? 'is-selected' : ''}"
              type="button"
              draggable="true"
              data-sequence-index="${position}"
              aria-label="Movable color tile ${position + 1} of ${trial.order.length}${selected ? ', selected' : ''}"
              aria-pressed="${selected}"
              style="--tile-color:${toRgbCss(color.l, color.c, color.h)}"
            ><span>${String(position + 1).padStart(2, '0')}</span></button>`;
            })
            .join('')}
        </div>
        ${sequenceAnchor(last, 'End anchor')}
      </div>

      <div class="sequence-controls">
        <p id="sequence-status">${selectedSequenceIndex === null ? 'Select a tile to move it.' : `Tile ${selectedSequenceIndex + 1} selected.`}</p>
        <div class="ui-cluster">
          <button class="ui-button ui-button--ghost" type="button" data-action="move-sequence" data-direction="-1" ${selectedSequenceIndex === null ? 'disabled' : ''}>
            <span aria-hidden="true">←</span> Move left
          </button>
          <button class="ui-button ui-button--ghost" type="button" data-action="move-sequence" data-direction="1" ${selectedSequenceIndex === null ? 'disabled' : ''}>
            Move right <span aria-hidden="true">→</span>
          </button>
          <button class="ui-button" type="button" data-action="submit-sequence">Lock this order</button>
        </div>
      </div>
    </div>
  `;
}

function sequenceAnchor(color, label) {
  return `<div class="sequence-anchor" style="--tile-color:${toRgbCss(color.l, color.c, color.h)}">
    <span>${label}</span>
  </div>`;
}

function answerChoice(choice) {
  if (!session || session.phase.id === 'sequence') return;
  const phaseBefore = session.phase.id;
  const result = session.answerChoice(choice, performance.now() - trialStartedAt);

  if (result.done) {
    renderResults();
    return;
  }

  if (session.phase.id !== phaseBefore) {
    announce(`Instrument ${session.phase.number}. ${session.phase.name}. ${phasePrompt(session.phase.id)}`);
  } else {
    announce(result.correct ? 'Recorded. Next trial.' : 'Recorded. The difference will increase.');
  }

  selectedSequenceIndex = null;
  trialStartedAt = performance.now();
  renderLab();
  app.dataset.feedback = result.correct ? 'correct' : 'miss';
  window.setTimeout(() => delete app.dataset.feedback, 260);
}

function selectSequence(index) {
  if (session?.phase.id !== 'sequence') return;

  if (selectedSequenceIndex === null) {
    selectedSequenceIndex = index;
  } else if (selectedSequenceIndex === index) {
    selectedSequenceIndex = null;
  } else {
    session.swapSequence(selectedSequenceIndex, index);
    selectedSequenceIndex = index;
    announce(`Tiles swapped. Tile ${index + 1} selected.`);
  }

  renderLab();
  document.querySelector(`[data-sequence-index="${selectedSequenceIndex ?? index}"]`)?.focus();
}

function moveSequence(direction) {
  if (selectedSequenceIndex === null || !session) return;
  const moved = session.moveSequence(selectedSequenceIndex, direction);
  if (!moved) {
    announce('That tile is already at the edge.');
    return;
  }
  selectedSequenceIndex += direction;
  renderLab();
  document.querySelector(`[data-sequence-index="${selectedSequenceIndex}"]`)?.focus();
  announce(`Tile moved to position ${selectedSequenceIndex + 1}.`);
}

function submitSequence() {
  if (session?.phase.id !== 'sequence') return;
  const result = session.submitSequence(performance.now() - trialStartedAt);
  selectedSequenceIndex = null;

  if (result.done) {
    renderResults();
    return;
  }

  trialStartedAt = performance.now();
  announce(`Order recorded. Run ${session.trialIndex + 1} of ${session.phase.trials}.`);
  renderLab();
}

function renderResults() {
  labActive = false;
  document.body.classList.add('lab-mode');
  document.title = 'Your color profile — Tetracromia';
  const result = session.results();
  const previous = loadBestResult();
  if (!previous || result.overall > previous.overall) saveBestResult(result);
  const profile = profileLabel(result.overall);

  app.innerHTML = `
    <section class="results-view ui-container ui-container--wide">
      <div class="results-head">
        <div>
          <p class="ui-eyebrow">Session complete / ${formatDuration(result.elapsedMs)}</p>
          <h1>Your visible boundary, on this display.</h1>
          <p>${profile.detail}</p>
        </div>
        <div class="score-lockup" aria-label="Session acuity index ${result.overall} out of 100">
          <span>Session index</span>
          <strong>${result.overall}</strong>
          <small>/ 100</small>
        </div>
      </div>

      <div class="results-grid">
        <article class="profile-card ui-card">
          <div class="ui-card__head">
            <div>
              <p class="ui-eyebrow ui-eyebrow--muted">Hue profile</p>
              <h2>${profile.title}</h2>
            </div>
            <span class="ui-badge ui-badge--accent">Display-relative</span>
          </div>
          ${renderRadar(result.hueProfile)}
          <div class="profile-key" aria-hidden="true">
            ${['Warm', 'Yellow', 'Green', 'Cyan', 'Blue', 'Magenta'].map((label, index) => `<span style="--key:${toRgbCss(0.68, 0.12, index * 60 + 20)}">${label}</span>`).join('')}
          </div>
        </article>

        <div class="result-details">
          ${resultMetric('01', 'Threshold', result.thresholdScore, `Boundary ≈ ${result.thresholdDelta.toFixed(2)} ΔEOK`, `${result.thresholdAccuracy}% choices correct`)}
          ${resultMetric('02', 'Field', result.fieldScore, `Boundary ≈ ${result.fieldDelta.toFixed(2)} ΔEOK`, `${result.fieldAccuracy}% choices correct`)}
          ${resultMetric('03', 'Sequence', result.sequenceScore, 'Adjacent hue ordering', 'Lower inversion count is better')}
        </div>
      </div>

      <div class="result-note ui-alert ui-alert--info">
        <div class="ui-alert__body">
          <strong class="ui-alert__title">What this score means</strong>
          <p>
            It summarizes this run on this browser and screen. It is useful for comparing your own
            sessions under similar conditions. It is not a population percentile, diagnosis, or
            evidence for tetrachromacy.
          </p>
        </div>
      </div>

      <div class="results-actions">
        <button class="ui-button ui-button--lg" type="button" data-action="setup">Run again</button>
        <button class="ui-button ui-button--ghost" type="button" data-action="copy-results">Copy summary</button>
        <button class="ui-button ui-button--subtle" type="button" data-action="home">Return to method</button>
      </div>

      ${previous ? `<p class="previous-score">Previous best on this browser: <strong>${previous.overall}/100</strong></p>` : ''}
    </section>
  `;

  document.querySelector('#main').focus({ preventScroll: true });
  announce(
    `Session complete. Your display-relative index is ${result.overall} out of 100. ${profile.title}.`,
  );
}

function resultMetric(number, title, score, detail, note) {
  return `<article class="result-metric">
    <div class="result-metric__head">
      <span>${number}</span>
      <div><h3>${title}</h3><p>${detail}</p></div>
      <strong>${score}</strong>
    </div>
    <div class="metric-meter">
      <div class="metric-meter__row"><span>${note}</span><strong>${score}/100</strong></div>
      <div class="ui-meter ui-meter--accent" role="meter" aria-label="${title} score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}">
        <span class="ui-meter__fill" style="--value:${score}"></span>
      </div>
    </div>
  </article>`;
}

function renderRadar(values) {
  const center = 150;
  const radius = 104;
  const points = values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
      const distance = 28 + (radius - 28) * (value / 100);
      return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
    })
    .join(' ');
  const axes = values
    .map((_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
      return `<line x1="${center}" y1="${center}" x2="${center + Math.cos(angle) * radius}" y2="${center + Math.sin(angle) * radius}" />`;
    })
    .join('');

  return `<svg class="profile-radar" viewBox="0 0 300 300" role="img" aria-label="Six-direction hue discrimination profile">
    <defs>
      <linearGradient id="profile-fill" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${toRgbCss(0.7, 0.14, 20)}" />
        <stop offset="0.5" stop-color="${toRgbCss(0.7, 0.14, 160)}" />
        <stop offset="1" stop-color="${toRgbCss(0.7, 0.14, 285)}" />
      </linearGradient>
    </defs>
    <g class="profile-radar__grid">
      <circle cx="150" cy="150" r="28" /><circle cx="150" cy="150" r="54" />
      <circle cx="150" cy="150" r="79" /><circle cx="150" cy="150" r="104" />${axes}
    </g>
    <polygon class="profile-radar__area" points="${points}" />
    ${points
      .split(' ')
      .map((point) => {
        const [x, y] = point.split(',');
        return `<circle class="profile-radar__point" cx="${x}" cy="${y}" r="4" />`;
      })
      .join('')}
  </svg>`;
}

function profileLabel(score) {
  if (score >= 86)
    return {
      title: 'Very fine screen-level discrimination',
      detail: 'You resolved small display differences consistently across the three instruments.',
    };
  if (score >= 72)
    return {
      title: 'Fine screen-level discrimination',
      detail: 'You resolved subtle display differences with a stable overall profile.',
    };
  if (score >= 56)
    return {
      title: 'Moderate screen-level discrimination',
      detail: 'You found clear differences; the finest steps were less consistent in this run.',
    };
  return {
    title: 'Broad screen-level discrimination',
    detail: 'The smallest display steps were difficult in this run. Screen setup and fatigue can matter.',
  };
}

function formatDuration(milliseconds) {
  const seconds = Math.max(1, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function loadBestResult() {
  try {
    return JSON.parse(localStorage.getItem('tetracromia-best'));
  } catch {
    return null;
  }
}

function saveBestResult(result) {
  try {
    localStorage.setItem(
      'tetracromia-best',
      JSON.stringify({ overall: result.overall, savedAt: new Date().toISOString() }),
    );
  } catch {}
}

async function copyResults() {
  if (!session) return;
  const result = session.results();
  const summary = `Tetracromia — ${result.overall}/100 screen-level color discrimination. Threshold ${result.thresholdScore}, Field ${result.fieldScore}, Sequence ${result.sequenceScore}. Device-relative, not diagnostic.`;

  try {
    await navigator.clipboard.writeText(summary);
    toast('Result summary copied', { tone: 'success' });
  } catch {
    toast('Could not access the clipboard', { tone: 'danger' });
  }
}

function announce(message) {
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

document.addEventListener('change', (event) => {
  if (event.target.matches('#screen-ready')) {
    document.querySelector('#start-lab').disabled = !event.target.checked;
  }
});

document.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-choice]');
  if (choice) {
    answerChoice(Number(choice.dataset.choice));
    return;
  }

  const sequenceTile = event.target.closest('[data-sequence-index]');
  if (sequenceTile) {
    selectSequence(Number(sequenceTile.dataset.sequenceIndex));
    return;
  }

  const action = event.target.closest('[data-action]');
  if (!action) return;

  if (action.dataset.action === 'setup') renderSetup();
  if (action.dataset.action === 'start' && !action.disabled) startLab();
  if (action.dataset.action === 'home') {
    if (labActive && !window.confirm('End this session? Your progress will be lost.')) return;
    renderHome();
  }
  if (action.dataset.action === 'move-sequence') moveSequence(Number(action.dataset.direction));
  if (action.dataset.action === 'submit-sequence') submitSequence();
  if (action.dataset.action === 'copy-results') copyResults();
});

document.addEventListener('keydown', (event) => {
  const tile = event.target.closest('[data-sequence-index]');
  if (!tile || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  selectedSequenceIndex = Number(tile.dataset.sequenceIndex);
  moveSequence(event.key === 'ArrowLeft' ? -1 : 1);
});

document.addEventListener('dragstart', (event) => {
  const tile = event.target.closest('[data-sequence-index]');
  if (!tile) return;
  draggedSequenceIndex = Number(tile.dataset.sequenceIndex);
  event.dataTransfer.effectAllowed = 'move';
});

document.addEventListener('dragover', (event) => {
  if (event.target.closest('[data-sequence-index]')) event.preventDefault();
});

document.addEventListener('drop', (event) => {
  const tile = event.target.closest('[data-sequence-index]');
  if (!tile || draggedSequenceIndex === null || !session) return;
  event.preventDefault();
  const targetIndex = Number(tile.dataset.sequenceIndex);
  session.swapSequence(draggedSequenceIndex, targetIndex);
  selectedSequenceIndex = targetIndex;
  draggedSequenceIndex = null;
  renderLab();
  announce(`Tile moved to position ${targetIndex + 1}.`);
});
