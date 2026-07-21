/*
 * Shared gallery markup for the static build and the interactive app. Keeping
 * one renderer lets the client adopt the server-rendered page without a
 * visible replacement after first paint.
 */

const PLANNED = [];

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

/**
 * @param {{
 *   exams: readonly any[],
 *   locale: string,
 *   localeHref: (route: string) => string,
 *   m: (id: import('./i18n/message-ids.js').MessageId) => string,
 *   t: (source: string, values?: Record<string, string | number>) => string,
 * }} context
 */
export function galleryMarkup({ exams, locale, localeHref, m, t }) {
  return `
    <section class="gallery-hero ui-container ui-container--wide" data-sense6-view="gallery" data-sense6-locale="${locale}">
      <div class="gallery-hero__copy">
        <p class="ui-eyebrow">Sense6</p>
        <h1>${t('Measure what your')} <em>${t('senses notice.')}</em></h1>
        <p class="gallery-hero__lede">
          ${t('Short, careful tests that turn what you notice into honest, device-relative results.')}
          ${t('No account, no answers or results uploaded.')}
        </p>
        <p class="gallery-hero__boundary">
          ${m('boundary.recreational')}
        </p>
        <a class="ui-link gallery-hero__about" data-sense6-route="about" href="${localeHref('about')}">
          ${t('How Sense6 works')} <span aria-hidden="true">→</span>
        </a>
      </div>

      <div class="sense-mark" aria-hidden="true">
        <div class="sense-mark__field">
          <span class="sense-mark__ring sense-mark__ring--outer"></span>
          <span class="sense-mark__ring sense-mark__ring--inner"></span>
          ${Array.from(
            { length: 6 },
            (_, index) => `<i class="sense-mark__signal" style="--signal:${index}"></i>`,
          ).join('')}
          <div class="sense-mark__core"><strong>Sense<span>6</span></strong></div>
        </div>
      </div>
    </section>

    <section class="tests-section ui-container ui-container--wide" id="tests">
      <header class="gallery-heading">
        <div>
          <p class="ui-eyebrow">${t('Ready now / choose a test')}</p>
          <h2>${t('Start with what you want to learn.')}</h2>
        </div>
        <p>
          ${t('Each test explains its limits before you begin and gives you a result you can actually interpret afterwards.')}
        </p>
      </header>
      <div class="exam-grid">
        ${exams.map((meta) => liveCard(meta, localeHref, m, t)).join('')}
      </div>
    </section>

    ${
      PLANNED.length
        ? `<section class="roadmap ui-container ui-container--wide" aria-labelledby="roadmap-title">
            <div class="roadmap__intro"><p class="ui-eyebrow">${t('Next in the lab')}</p><h2 id="roadmap-title">${t('More senses, same standard.')}</h2><p>${t('In development — visible here as direction, not as something you can start yet.')}</p></div>
            <div class="roadmap__list">${PLANNED.map((meta, index) => plannedItem(meta, index, exams.length, t)).join('')}</div>
          </section>`
        : ''
    }
  `;
}

function liveCard(meta, localeHref, m, t) {
  return `
    <article class="exam-card ui-card ui-card--interactive" style="--card-accent:${meta.accent}">
      <a class="exam-card__link" data-sense6-route="${meta.route}" href="${localeHref(meta.route)}">
        <div class="exam-card__visual exam-card__visual--${meta.id}">
          ${previewVisual(meta.id)}
          <span class="exam-card__glyph" aria-hidden="true">${meta.glyph}</span>
        </div>
        <div class="exam-card__body">
          <div class="ui-cluster ui-cluster--between exam-card__meta">
            <span class="ui-eyebrow">${t(meta.category)}</span>
            <span class="ui-tag">${t('≈ {minutes} min', { minutes: meta.durationMinutes })}</span>
          </div>
          <h3>${meta.name}</h3>
          <p class="exam-card__tagline">${t(meta.tagline)}</p>
          <p class="exam-card__blurb">${t(meta.blurb)}</p>
          <ul class="exam-card__facts" aria-label="${m('gallery.testIncludes')}">
            ${meta.facts.map((fact) => `<li>${t(fact)}</li>`).join('')}
          </ul>
          <span class="exam-card__cta">${m('action.openTest')} <span aria-hidden="true">→</span></span>
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

  if (id === 'acutezza') {
    return `<div class="mini-acuity" aria-hidden="true"><i></i><span></span><b>13.5°</b></div>`;
  }

  return `
    <div class="mini-plate" aria-hidden="true">
      ${PLATE_EIGHT.flatMap((row) => [...row])
        .map((cell) => `<i class="${cell === '1' ? 'is-figure' : ''}"></i>`)
        .join('')}
    </div>
  `;
}

function plannedItem(meta, index, liveCount, t) {
  return `
    <article class="roadmap-item">
      <span class="roadmap-item__index" aria-hidden="true">${String(index + liveCount + 1).padStart(2, '0')}</span>
      <span class="roadmap-item__glyph" aria-hidden="true">${meta.glyph}</span>
      <div>
        <h3>${meta.name}</h3>
        <p>${t(meta.tagline)}</p>
      </div>
      <span class="roadmap-item__duration">${t(meta.duration)}</span>
    </article>
  `;
}
