export const CRAWLER_POLICY = Object.freeze({
  reviewedAt: '2026-07-19',
  reviewBy: '2027-01-19',
  intent:
    'Allow search indexing and user-directed retrieval while declining provider model-development crawling.',
  rules: Object.freeze([
    rule('*', true, 'General search and retrieval'),
    rule('GPTBot', false, 'OpenAI model development'),
    rule('ClaudeBot', false, 'Anthropic model development'),
    rule('OAI-SearchBot', true, 'ChatGPT search'),
    rule('ChatGPT-User', true, 'User-directed ChatGPT retrieval'),
    rule('Claude-SearchBot', true, 'Claude search'),
    rule('Claude-User', true, 'User-directed Claude retrieval'),
  ]),
  sources: Object.freeze([
    'https://help.openai.com/en/articles/12627856-publishers-and-developers-faq',
    'https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler',
  ]),
});

/** @param {string} origin */
export function renderRobots(origin) {
  const groups = CRAWLER_POLICY.rules
    .map(({ agent, allow }) => `User-agent: ${agent}\n${allow ? 'Allow' : 'Disallow'}: /`)
    .join('\n\n');
  return `# Policy reviewed ${CRAWLER_POLICY.reviewedAt}; review by ${CRAWLER_POLICY.reviewBy}\n${groups}\n\nSitemap: ${origin}/sitemap.xml\n`;
}

/** @param {string} agent @param {boolean} allow @param {string} purpose */
function rule(agent, allow, purpose) {
  return Object.freeze({ agent, allow, purpose });
}
