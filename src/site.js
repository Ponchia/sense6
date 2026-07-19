/*
 * Sense6 gallery — the suite's front door. Live exams come from the module
 * registry; the roadmap is deliberately quieter so unfinished work never
 * competes with tests people can take now.
 */

const PLANNED = [
  { name: 'Acutezza', tagline: 'Visual acuity & astigmatism', glyph: '◎', duration: '≈ 2 min' },
];

const TEST_DETAILS = {
  tetracromia: {
    category: 'Colour discrimination',
    facts: ['Adaptive difficulty', '3 instruments', 'Detailed profile'],
  },
  'color-blindness': {
    category: 'Colour-vision experiment',
    facts: ['Adaptive thresholds', '3 display directions', 'Run-relative result'],
  },
  riflessi: {
    category: 'Response timing',
    facts: ['3 instruments', 'Device-relative timing', 'No composite score'],
  },
  udito: {
    category: 'Listening experiment',
    facts: ['3 instruments', 'Volume safety contract', 'No hearing label'],
  },
};

const PLATE_EIGHT = [
  '001111100',
  '011000110',
  '010000010',
  '011000110',
  '001111100',
  '011000110',
  '010000010',
  '011000110',
  '001111100',
];

export function renderGallery(context) {
  const { app, exams, localeHref } = context;
  document.title = 'Sense6 — measure what your senses notice';

  app.innerHTML = `
    <section class="gallery-hero ui-container ui-container--wide">
      <div class="gallery-hero__copy">
        <p class="ui-eyebrow">Sense6 / private perception lab</p>
        <h1>Measure what your <em>senses notice.</em></h1>
        <p class="gallery-hero__lede">
          Short, careful tests that turn what you notice into honest, device-relative results.
          No account, no upload, no diagnosis theatre.
        </p>
        <div class="ui-cluster gallery-hero__actions">
          <a class="ui-button ui-button--lg" href="${localeHref('udito')}">
            Try Udito <span aria-hidden="true">·</span> 6 min <span aria-hidden="true">→</span>
          </a>
          <a class="ui-link ui-link--cta" href="#tests">Explore all four tests</a>
        </div>
        <dl class="gallery-proof" aria-label="Sense6 at a glance">
          <div><dt>Live now</dt><dd>${String(exams.length).padStart(2, '0')} tests</dd></div>
          <div><dt>Time for all</dt><dd>≈ 20 min</dd></div>
          <div><dt>Data uploaded</dt><dd>None</dd></div>
        </dl>
      </div>

      <div class="sense-map" aria-hidden="true">
        <div class="sense-map__head">
          <span>Live signal</span>
          <span>Device relative</span>
        </div>
        <div class="sense-map__field">
          <div class="sense-map__axis sense-map__axis--one"></div>
          <div class="sense-map__axis sense-map__axis--two"></div>
          <div class="sense-map__orbit sense-map__orbit--outer"></div>
          <div class="sense-map__orbit sense-map__orbit--inner"></div>
          <div class="sense-map__core">
            <strong>S</strong>
            <small>Sense6</small>
          </div>
          <span class="sense-map__label sense-map__label--colour">Colour</span>
          <span class="sense-map__label sense-map__label--vision">Hearing</span>
        </div>
        <div class="sense-map__channels">
          <span><i></i> Threshold</span>
          <span><i></i> Pattern</span>
          <span><i></i> Profile</span>
        </div>
      </div>
    </section>

    <section class="tests-section ui-container ui-container--wide" id="tests">
      <header class="gallery-heading">
        <div>
          <p class="ui-eyebrow">Ready now / choose a test</p>
          <h2>Start with what you want to learn.</h2>
        </div>
        <p>
          Each test explains its limits before you begin and gives you a result you can actually
          interpret afterwards.
        </p>
      </header>
      <div class="exam-grid">
        ${exams.map((meta) => liveCard(meta, localeHref)).join('')}
      </div>
    </section>

    <section class="roadmap ui-container ui-container--wide" aria-labelledby="roadmap-title">
      <div class="roadmap__intro">
        <p class="ui-eyebrow">Next in the lab</p>
        <h2 id="roadmap-title">More senses, same standard.</h2>
        <p>In development — visible here as direction, not as something you can start yet.</p>
      </div>
      <div class="roadmap__list">
        ${PLANNED.map((meta, index) => plannedItem(meta, index, exams.length)).join('')}
      </div>
    </section>

    <section class="principles ui-container ui-container--wide" aria-labelledby="principles-title">
      <div class="principles__intro">
        <p class="ui-eyebrow">Useful because the limits are visible</p>
        <h2 id="principles-title">Careful by construction.</h2>
      </div>
      <div class="ui-grid principles__grid">
        <article class="ui-card">
          <span class="principles__number" aria-hidden="true">01</span>
          <h3>Private in practice</h3>
          <p>Your session stays in this browser. There is no account and nothing is uploaded.</p>
        </article>
        <article class="ui-card">
          <span class="principles__number" aria-hidden="true">02</span>
          <h3>Honest about hardware</h3>
          <p>Your screen, audio hardware, room and attention affect results. Every test exposes its setup limits.</p>
        </article>
        <article class="ui-card">
          <span class="principles__number" aria-hidden="true">03</span>
          <h3>Insight, not a label</h3>
          <p>Results describe this run and this setup. They never pretend to replace calibrated clinical work.</p>
        </article>
      </div>
    </section>
  `;

  return () => {};
}

function liveCard(meta, localeHref) {
  const details = TEST_DETAILS[meta.id];
  return `
    <article class="exam-card ui-card ui-card--interactive" style="--card-accent:${meta.accent}">
      <a class="exam-card__link" href="${localeHref(meta.id)}">
        <div class="exam-card__visual exam-card__visual--${meta.id}">
          ${previewVisual(meta.id)}
          <span class="exam-card__glyph" aria-hidden="true">${meta.glyph}</span>
        </div>
        <div class="exam-card__body">
          <div class="ui-cluster ui-cluster--between exam-card__meta">
            <span class="ui-eyebrow">${details.category}</span>
            <span class="ui-tag">${meta.duration}</span>
          </div>
          <h3>${meta.name}</h3>
          <p class="exam-card__tagline">${meta.tagline}</p>
          <p class="exam-card__blurb">${meta.blurb}</p>
          <ul class="exam-card__facts" aria-label="What this test includes">
            ${details.facts.map((fact) => `<li>${fact}</li>`).join('')}
          </ul>
          <span class="exam-card__cta">Open test <span aria-hidden="true">→</span></span>
        </div>
      </a>
    </article>
  `;
}

function previewVisual(id) {
  if (id === 'tetracromia') {
    return `
      <div class="mini-spectrum" aria-hidden="true">
        ${Array.from({ length: 11 }, (_, index) => `<i style="--step:${index}"></i>`).join('')}
      </div>
      <div class="mini-threshold" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    `;
  }

  if (id === 'riflessi') {
    return `
      <div class="mini-reflex" aria-hidden="true">
        <i></i><span></span><b>245<small>ms</small></b>
      </div>
    `;
  }

  if (id === 'udito') {
    return `
      <div class="mini-audio" aria-hidden="true">
        ${Array.from({ length: 24 }, (_, index) => `<i style="--wave:${index}"></i>`).join('')}
        <span>500</span><span>2k</span><span>18k</span>
      </div>
    `;
  }

  return `
    <div class="mini-plate" aria-hidden="true">
      ${PLATE_EIGHT.flatMap((row) => [...row])
        .map((cell) => `<i class="${cell === '1' ? 'is-figure' : ''}"></i>`)
        .join('')}
    </div>
  `;
}

function plannedItem(meta, index, liveCount) {
  return `
    <article class="roadmap-item">
      <span class="roadmap-item__index" aria-hidden="true">${String(index + liveCount + 1).padStart(2, '0')}</span>
      <span class="roadmap-item__glyph" aria-hidden="true">${meta.glyph}</span>
      <div>
        <h3>${meta.name}</h3>
        <p>${meta.tagline}</p>
      </div>
      <span class="roadmap-item__duration">${meta.duration}</span>
    </article>
  `;
}
