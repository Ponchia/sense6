import { CONTENT_DATES } from './content-dates.js';
import content from './learn-content.json' with { type: 'json' };
import { activateTimingIllustration, timingIllustrationMarkup } from './learn-timing-illustration.js';
import { LEARN_ROUTES } from './routes.js';
import { CREATOR_PROFILE_URL } from './site-identity.js';

const byline = 'Zeno';

/** @param {string} route */
export function learnPage(route) {
  if (route === 'learn') return content.overview;
  return content.articles[route] ?? null;
}

/** @param {string} route */
export function learnMetadata(route) {
  const page = learnPage(route);
  if (!page || !LEARN_ROUTES.includes(route)) return null;
  return {
    title: page.metaTitle,
    description: page.description,
    // Each article reuses the existing 1200x630 card for its related
    // instrument; the Learn index retains the generic Sense6 preview.
    socialImage: route === 'learn' ? '/social/sense6.png' : `/social/${page.experiment.route}.png`,
    socialImageAlt:
      route === 'learn' ? page.description : `Sense6 experiment artwork: ${page.experiment.title}`,
    dateModified: route === 'learn' ? CONTENT_DATES.learn : page.dateModified,
    references: route === 'learn' ? [] : page.sources,
  };
}

/**
 * All Learn pages use the same renderer for HTML generation and runtime.
 * Static HTML is adopted intact on initial hydration, not swapped or rewritten.
 * @param {{app: HTMLElement, locale: string}} context
 * @param {string} route
 */
export function renderLearn(context, route) {
  if (context.locale !== 'en' || !LEARN_ROUTES.includes(route)) {
    throw new Error('English Learn page is unavailable in this locale');
  }
  if (!context.app.querySelector(`:scope > [data-sense6-view="learn"][data-sense6-route="${route}"]`)) {
    context.app.innerHTML = learnMarkup(route);
  }
  return route === 'reaction-time-guide' ? activateTimingIllustration(context.app) : () => {};
}

/** @param {string} route */
export function learnMarkup(route) {
  if (!LEARN_ROUTES.includes(route)) throw new Error('Unknown Sense6 Learn route');
  if (route === 'learn') return overviewMarkup();
  return articleMarkup(route, content.articles[route]);
}

function overviewMarkup() {
  const page = content.overview;
  return `
    <div class="learn-view ui-container ui-container--wide" data-sense6-view="learn" data-sense6-route="learn">
      <nav class="learn-breadcrumb" aria-label="Breadcrumb"><a data-sense6-route="" href="/en/">All experiments</a><span aria-hidden="true">/</span><span aria-current="page">Learn</span></nav>
      <header class="learn-hero">
        <h1>${esc(page.title)}</h1>
        <p class="learn-hero__lede">${esc(page.intro)}</p>
        <p class="learn-hero__date">By <a href="${CREATOR_PROFILE_URL}" rel="me noreferrer">Zeno</a> · Reviewed ${esc(page.updated)}</p>
      </header>
      <section aria-labelledby="learn-topics" class="learn-topics">
        <div class="learn-section-heading"><h2 id="learn-topics">Research guides</h2></div>
        <div class="learn-topic-grid">
          ${Object.entries(content.articles)
            .map(
              ([id, article]) => `<article class="learn-topic">
            <p class="ui-eyebrow">${esc(article.eyebrow)}</p>
            <h3><a data-sense6-route="${id}" href="/en/${id}/">${esc(article.title)}</a></h3>
            <p>${esc(article.description)}</p>
          </article>`,
            )
            .join('')}
        </div>
      </section>
      <aside class="learn-boundary" aria-label="Interpretation limits"><p>${esc(page.boundary)}</p></aside>
      <section class="learn-next" aria-label="Explore experiments">
        <div><h2>Try an experiment</h2><p>Each lab explains its setup and records results in your browser. Choose a short scope to see how the task works; return to a guide when you want to understand its result.</p></div>
        <a class="ui-button" data-sense6-route="" href="/en/">Explore all five experiments →</a>
      </section>
    </div>
  `;
}

/** @param {string} route @param {(typeof content.articles)['tetrachromacy-guide']} article */
function articleMarkup(route, article) {
  const relatedRoute = {
    'tetrachromacy-guide': 'color-blindness-guide',
    'color-blindness-guide': 'tetrachromacy-guide',
    'reaction-time-guide': 'hearing-range-guide',
    'hearing-range-guide': 'visual-acuity-guide',
    'visual-acuity-guide': 'hearing-range-guide',
  }[route];
  const relatedArticle = content.articles[relatedRoute];
  const experimentPath = article.experiment.href || `/en/${article.experiment.route}/`;
  return `
    <article class="learn-view learn-article ui-container ui-container--wide" data-sense6-view="learn" data-sense6-route="${route}">
      <nav class="learn-breadcrumb" aria-label="Breadcrumb"><a data-sense6-route="" href="/en/">All experiments</a><span aria-hidden="true">/</span><a data-sense6-route="learn" href="/en/learn/">Learn</a><span aria-hidden="true">/</span><span aria-current="page">${esc(article.title)}</span></nav>
      <header class="learn-hero">
        <p class="ui-eyebrow">${esc(article.eyebrow)}</p>
        <h1>${esc(article.title)}</h1>
        <p class="learn-hero__date">By <a href="${CREATOR_PROFILE_URL}" rel="me noreferrer">${byline}</a> · Reviewed <time datetime="${article.dateModified}">${esc(article.updated)}</time></p>
      </header>
      <section class="learn-answer" aria-labelledby="answer-title">
        <h2 id="answer-title">Short answer</h2>
        <p>${esc(article.summary)}</p>
        <div class="learn-answer__try">
          <a class="ui-link" data-learn-early-experiment href="${esc(experimentPath)}">${esc(article.experiment.title)} →</a>
          <p class="learn-answer__try-note">${esc(article.experiment.hint)}</p>
        </div>
      </section>
      <nav class="learn-contents" aria-label="On this page">
        <p class="ui-eyebrow">In this guide</p>
        <ol>${article.sections
          .map((section, i) => `<li><a href="#learn-section-${i + 1}">${esc(section.heading)}</a></li>`)
          .join('')}
          <li><a href="#research-sources">Sources and their roles</a></li>
        </ol>
      </nav>
      ${route === 'reaction-time-guide' ? timingIllustrationMarkup() : ''}
      <div class="learn-article__columns">
        <div class="learn-article__body">
          ${article.sections
            .map(
              (section, i) => `<section aria-labelledby="learn-section-${i + 1}">
            <h2 id="learn-section-${i + 1}">${esc(section.heading)}</h2>
            ${section.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
            ${relatedSourcesMarkup(section, article)}
          </section>`,
            )
            .join('')}
        </div>
        <aside class="learn-side">
          <section class="learn-experiment" aria-labelledby="related-experiment">
            <h2 id="related-experiment">${esc(article.experiment.title)}</h2>
            <p>${esc(article.experiment.hint)}</p>
            <a class="ui-button" href="${esc(experimentPath)}">Open the experiment →</a>
          </section>
          <section class="learn-references" aria-labelledby="research-sources">
            <h2 id="research-sources">Sources and their roles</h2>
            <p>Research papers address the scientific question; standards describe equipment or browser behaviour. The Sense6 link documents the task implemented here. None validates the Sense6 protocol.</p>
            <ol>${article.sources
              .map(
                (source, i) => `<li id="learn-source-${esc(source.id)}" tabindex="-1">
              <span class="learn-reference-role">[${i + 1}] ${esc(source.role)}</span>
              <a href="${esc(source.href)}"${source.href.startsWith('https://') ? ' target="_blank" rel="noreferrer"' : ''}>${esc(source.title)}</a>
            </li>`,
              )
              .join('')}</ol>
          </section>
        </aside>
      </div>
      <aside class="learn-boundary" aria-label="Interpretation boundary">
        <p>Sense6 is a recreational browser lab, not a clinical or diagnostic test. Answers and measurements stay on your device.</p>
      </aside>
      <nav class="learn-further" aria-label="Keep exploring">
        <div><span class="ui-eyebrow">Another question</span><a data-sense6-route="${relatedRoute}" href="/en/${relatedRoute}/">${esc(relatedArticle.title)} →</a></div>
        <a data-sense6-route="learn" href="/en/learn/">← All research guides</a>
      </nav>
    </article>
  `;
}

/** Connect a section to its cited background, specification or Sense6 method
 * without suggesting those sources directly validate this browser protocol.
 * @param {(typeof content.articles)['tetrachromacy-guide']['sections'][number]} section
 * @param {(typeof content.articles)['tetrachromacy-guide']} article
 */
function relatedSourcesMarkup(section, article) {
  const links = section.sourceIds.map((id) => {
    const position = article.sources.findIndex((source) => source.id === id);
    if (position === -1) throw new Error(`Unknown Learn reference: ${id}`);
    const source = article.sources[position];
    return `<a href="#learn-source-${esc(id)}" aria-label="Source ${position + 1}: ${esc(source.role)}">[${position + 1}]</a>`;
  });
  return `<p class="learn-section-sources">Sources ${links.join(' ')}</p>`;
}

/** @param {string} value */
function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
