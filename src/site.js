/*
 * Site gallery — the landing that lists the exams. Live exams come from the
 * registry metas; "planned" cards advertise the roadmap so the suite reads as
 * a growing collection rather than a single test.
 */

const PLANNED = [
  { name: 'Riflessi', tagline: 'Reaction time & timing', glyph: '⚡', duration: '≈ 1 min' },
  { name: 'Udito', tagline: 'Hearing range & pitch', glyph: '♪', duration: '≈ 3 min' },
  { name: 'Acutezza', tagline: 'Visual acuity & astigmatism', glyph: '◎', duration: '≈ 2 min' },
];

export function renderGallery(context) {
  const { app, exams, navigate } = context;
  document.title = 'Sensoria — honest browser tests for how you see and sense';

  app.innerHTML = `
    <section class="gallery-hero ui-container ui-container--wide">
      <p class="ui-eyebrow">Perception tests / run in the browser / nothing uploaded</p>
      <h1>How well do your <em>senses</em> resolve the world?</h1>
      <p class="gallery-hero__lede">
        A small collection of careful, self-scoring perception tests. Each one is honest about what a
        consumer screen can and cannot measure — no diagnoses, no accounts, no data leaving the page.
      </p>
    </section>

    <section class="gallery ui-container ui-container--wide" aria-label="Available tests">
      ${exams.map(liveCard).join('')}
      ${PLANNED.map(plannedCard).join('')}
    </section>

    <section class="gallery-note ui-container ui-container--wide">
      <div class="ui-alert ui-alert--info">
        <div class="ui-alert__body">
          <strong class="ui-alert__title">Screen-based, on purpose</strong>
          <p>
            These run on whatever display you have, so results are relative to your screen, light,
            and attention — useful for comparing your own runs, never a substitute for a clinician's
            calibrated equipment.
          </p>
        </div>
      </div>
    </section>
  `;

  const controller = new AbortController();
  app.addEventListener(
    'click',
    (event) => {
      const card = event.target.closest('[data-exam]');
      if (card) navigate(card.dataset.exam);
    },
    { signal: controller.signal },
  );

  return () => controller.abort();
}

function liveCard(meta) {
  return `
    <button class="exam-card" type="button" data-exam="${meta.id}" style="--card-accent:${meta.accent}">
      <div class="exam-card__glyph" aria-hidden="true">${meta.glyph}</div>
      <div class="exam-card__body">
        <div class="ui-cluster ui-cluster--between">
          <h2>${meta.name}</h2>
          <span class="ui-tag">${meta.duration}</span>
        </div>
        <p class="exam-card__tagline">${meta.tagline}</p>
        <p class="exam-card__blurb">${meta.blurb}</p>
        <span class="exam-card__cta">Start <span aria-hidden="true">→</span></span>
      </div>
    </button>
  `;
}

function plannedCard(meta) {
  return `
    <div class="exam-card exam-card--planned" aria-disabled="true">
      <div class="exam-card__glyph" aria-hidden="true">${meta.glyph}</div>
      <div class="exam-card__body">
        <div class="ui-cluster ui-cluster--between">
          <h2>${meta.name}</h2>
          <span class="ui-tag ui-tag--muted">Planned</span>
        </div>
        <p class="exam-card__tagline">${meta.tagline}</p>
        <p class="exam-card__blurb">${meta.duration} · in development</p>
      </div>
    </div>
  `;
}
