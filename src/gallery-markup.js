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
 *   learnInfo?: { content: any, ui: Record<string,string> } | null,
 * }} context
 */
export function galleryMarkup({ exams, locale, localeHref, m, t, learnInfo = null }) {
  return `
    <section class="gallery-hero ui-container ui-container--wide" data-sense6-view="gallery" data-sense6-locale="${locale}">
      <div class="gallery-hero__copy">
        <p class="ui-eyebrow">Sense6</p>
        <h1 class="ui-display">${t('Measure what your')} <em>${t('senses notice.')}</em></h1>
        <p class="gallery-hero__lede">
          ${t('Short, careful tests that turn what you notice into honest, device-relative results.')}
          ${t('No account, no answers or results uploaded.')}
        </p>
        <p class="gallery-hero__boundary">
          ${m('boundary.recreational')}
        </p>
        <div class="gallery-hero__starter">
          <div class="gallery-hero__starter-copy">
            <p class="ui-eyebrow">${t('Riflessi — Reaction Time Lab')}</p>
            <p>${t('about 2 minutes')}</p>
          </div>
          <a class="ui-button gallery-hero__starter-link" data-sense6-starter="riflessi-signal" href="${localeHref('riflessi')}?scope=signal">
            ${t('Try a short reaction test')} <span aria-hidden="true">→</span>
          </a>
        </div>
        <div class="gallery-hero__actions">
          <a class="ui-link" href="#tests">${m('nav.allTests')} <span aria-hidden="true">↓</span></a>
          ${
            locale === 'en'
              ? '<a class="ui-link gallery-hero__learn" data-sense6-route="learn" href="/en/learn/">Explore the research <span aria-hidden="true">→</span></a>'
              : learnInfo
                ? `<a class="ui-link gallery-hero__learn" data-sense6-route="learn" href="/${locale}/learn/">${escapeLearnText(learnInfo.ui.Learn)} <span aria-hidden="true">→</span></a>`
                : ''
          }
          <a class="ui-link gallery-hero__about" data-sense6-route="about" href="${localeHref('about')}">
            ${t('How Sense6 works')} <span aria-hidden="true">→</span>
          </a>
        </div>
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
      locale === 'en'
        ? `
    <section class="gallery-learn ui-container ui-container--wide" aria-labelledby="gallery-learn-heading">
      <header class="gallery-heading">
        <div>
          <p class="ui-eyebrow">Perception, explained</p>
          <h2 id="gallery-learn-heading">Go beyond the test.</h2>
        </div>
        <p>What can a screen reveal about colour vision? How much of a reaction time belongs to your device? Research-backed explanations, without diagnosis claims.</p>
      </header>
      <div class="gallery-learn__links">
        <a data-sense6-route="tetrachromacy-guide" href="/en/tetrachromacy-guide/">
          <span class="ui-eyebrow">Colour vision</span>
          <strong>Can an online test detect tetrachromacy?</strong>
          <span class="gallery-learn__arrow" aria-hidden="true">Read →</span>
        </a>
        <a data-sense6-route="reaction-time-guide" href="/en/reaction-time-guide/">
          <span class="ui-eyebrow">Reaction timing</span>
          <strong>How accurate is a reaction-time test in a browser?</strong>
          <span class="gallery-learn__arrow" aria-hidden="true">Read →</span>
        </a>
        <a data-sense6-route="color-blindness-guide" href="/en/color-blindness-guide/">
          <span class="ui-eyebrow">Colour-vision differences</span>
          <strong>What can an online colour-blindness test tell you?</strong>
          <span class="gallery-learn__arrow" aria-hidden="true">Read →</span>
        </a>
      </div>
      <a class="ui-link gallery-learn__all" data-sense6-route="learn" href="/en/learn/">Browse the Learn section →</a>
    </section>`
        : learnInfo
          ? localizedLearnGallery(locale, learnInfo)
          : ''
    }

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

/**
 * A localized Learn preview exists only when its complete article catalog has
 * passed publication checks. EN retains the established first-screen cards.
 */
/** Escape authored Learn copy in localized gallery navigation. */
function escapeLearnText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function localizedLearnGallery(locale, { content, ui }) {
  const esc = escapeLearnText;
  const topics = Object.entries(content.articles)
    .slice(0, 3)
    .map(
      ([route, article]) => `<a data-sense6-route="${route}" href="/${locale}/${route}/">
          <span class="ui-eyebrow">${esc(article.eyebrow)}</span>
          <strong>${esc(article.title)}</strong>
          <span class="gallery-learn__arrow" aria-hidden="true">→</span>
        </a>`,
    )
    .join('');
  return `<section class="gallery-learn ui-container ui-container--wide" aria-labelledby="gallery-learn-heading">
    <header class="gallery-heading"><div>
      <p class="ui-eyebrow">${esc(ui.Learn)}</p>
      <h2 id="gallery-learn-heading">${esc(content.overview.title)}</h2>
    </div><p>${esc(content.overview.description)}</p></header>
    <div class="gallery-learn__links">${topics}</div>
    <a class="ui-link gallery-learn__all" data-sense6-route="learn" href="/${locale}/learn/">
      ${esc(ui.Learn)} →</a>
  </section>`;
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
          <h3>${t(meta.discoveryName ?? meta.name)}</h3>
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
