import { CONTENT_DATES } from './content-dates.js';
import content from './learn-content.json' with { type: 'json' };
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
  return () => {};
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
        <p class="ui-eyebrow">Sense6 / Learn</p>
        <h1>${esc(page.title)}</h1>
        <p class="learn-hero__lede">${esc(page.intro)}</p>
        <p class="learn-hero__date">By <a href="${CREATOR_PROFILE_URL}" rel="me noreferrer">Zeno</a> · Reviewed ${esc(page.updated)}</p>
      </header>
      <section aria-labelledby="learn-topics" class="learn-topics">
        <div class="learn-section-heading"><p class="ui-eyebrow">Start with a question</p><h2 id="learn-topics">Questions worth exploring</h2></div>
        <div class="learn-topic-grid">
          ${Object.entries(content.articles)
            .map(
              ([id, article], index) => `<article class="learn-topic">
            <span class="learn-topic__number" aria-hidden="true">0${index + 1}</span>
            <p class="ui-eyebrow">${esc(article.eyebrow)}</p>
            <h3><a data-sense6-route="${id}" href="/en/${id}/">${esc(article.title)}</a></h3>
            <p>${esc(article.description)}</p>
            <span class="learn-topic__cta" aria-hidden="true">Read the explanation →</span>
          </article>`,
            )
            .join('')}
        </div>
      </section>
      <aside class="learn-boundary" aria-label="Interpretation limits"><strong>What we can promise</strong><p>${esc(page.boundary)}</p></aside>
      <section class="learn-next" aria-label="Explore experiments">
        <div><p class="ui-eyebrow">Try it yourself</p><h2>The lab is one click away.</h2><p>The experiments describe one browser-and-device session, not your medical status.</p></div>
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
        <p class="learn-hero__lede">${esc(article.description)}</p>
        <p class="learn-hero__date">By <a href="${CREATOR_PROFILE_URL}" rel="me noreferrer">${byline}</a> · Reviewed <time datetime="${article.publishedDate}">${esc(article.updated)}</time></p>
      </header>
      <section class="learn-answer" aria-labelledby="answer-title">
        <p class="ui-eyebrow" id="answer-title">The short answer</p>
        <p>${esc(article.summary)}</p>
      </section>
      <nav class="learn-contents" aria-label="On this page">
        <p class="ui-eyebrow">In this guide</p>
        <ol>${article.sections
          .map(
            (section, i) =>
              `<li><a href="#learn-section-${i + 1}"><span aria-hidden="true">0${i + 1}</span>${esc(section.heading)}</a></li>`,
          )
          .join('')}
          <li><a href="#research-sources"><span aria-hidden="true">↗</span>Sources and their roles</a></li>
        </ol>
      </nav>
      <figure class="learn-model" aria-label="Three important parts of this question">
        <ol>${article.facts.map((fact, i) => `<li><span class="learn-model__num" aria-hidden="true">0${i + 1}</span><strong>${esc(fact.head)}</strong><p>${esc(fact.detail)}</p></li>`).join('')}</ol>
        <figcaption>A way to think about the problem · not a device calibration or research measurement.</figcaption>
      </figure>
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
            <p class="ui-eyebrow">Explore a real task</p>
            <h2 id="related-experiment">${esc(article.experiment.title)}</h2>
            <p>${esc(article.experiment.hint)}</p>
            <a class="ui-button" href="${esc(experimentPath)}">Open the experiment →</a>
          </section>
          <section class="learn-references" aria-labelledby="research-sources">
            <h2 id="research-sources">Sources and their roles</h2>
            <p>These sources explain science, engineering, or the Sense6 method. They do not validate the assembled Sense6 browser protocol.</p>
            <ol>${article.sources
              .map(
                (source) => `<li id="learn-source-${esc(source.id)}">
              <span class="ui-eyebrow">${esc(source.role)}</span>
              <a href="${esc(source.href)}"${source.href.startsWith('https://') ? ' target="_blank" rel="noreferrer"' : ''}>${esc(source.title)}</a>
            </li>`,
              )
              .join('')}</ol>
          </section>
        </aside>
      </div>
      <aside class="learn-boundary" aria-label="Interpretation boundary">
        <strong>Curiosity is the purpose, not diagnosis.</strong>
        <p>Browser experiments cannot reveal the biological or clinical status of your senses. Answers and measurements stay on your device. No paper cited here has validated this particular Sense6 implementation.</p>
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
    return `<a href="#learn-source-${esc(id)}">[${position + 1}] ${esc(source.role)}</a>`;
  });
  return `<p class="learn-section-sources"><span>Related sources</span> ${links.join(' · ')}</p>`;
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
