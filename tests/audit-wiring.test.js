import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('pull request CI is an unprivileged verification-only caller', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const allWorkflows = readdirSync(new URL('../.github/workflows/', import.meta.url))
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .map((file) => readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8'))
    .join('\n');

  assert.match(workflow, /permissions:\n\s+contents: read/);
  assert.doesNotMatch(workflow, /deployments:\s*write/);
  assert.doesNotMatch(workflow, /deploy_target|deploy_branch/);
  assert.doesNotMatch(workflow, /secrets:\s*inherit/);
  assert.doesNotMatch(allWorkflows, /pull_request_target/);
});

test('the reusable verifier cannot publish pull request previews', () => {
  const workflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');
  const deployWorkflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');

  assert.doesNotMatch(workflow, /deploy_target == 'preview'/);
  assert.doesNotMatch(workflow, /Publish the verified preview/);
  assert.doesNotMatch(workflow, /Smoke-test the real preview/);
  assert.match(deployWorkflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(deployWorkflow, /publish_production: true/);
});

test('production publication is followed by a non-writing deployed-browser gate', () => {
  const workflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');
  const config = readFileSync(new URL('../playwright.deployed.config.js', import.meta.url), 'utf8');
  const primaryConfig = readFileSync(new URL('../playwright.config.js', import.meta.url), 'utf8');
  const siteConfig = readFileSync(new URL('../playwright.site.config.js', import.meta.url), 'utf8');
  const journey = readFileSync(new URL('../tests/deployed/deployed.spec.js', import.meta.url), 'utf8');

  assert.match(workflow, /Verify the deployed JavaScript journey/);
  assert.match(workflow, /PLAYWRIGHT_DEPLOYED_URL: https:\/\/sense6\.net/);
  assert.match(workflow, /run: npm run test:deployed/);
  assert.match(workflow, /playwright-report\/deployed/);
  assert.match(workflow, /test-results\/deployed/);
  assert.match(config, /canonicalProductionURL = 'https:\/\/sense6\.net'/);
  assert.match(config, /failOnFlakyTests: true/);
  assert.match(config, /retries: process\.env\.CI \? 1 : 0/);
  assert.match(config, /trace: 'retain-on-failure'/);
  assert.match(config, /screenshot: 'only-on-failure'/);
  assert.match(primaryConfig, /testIgnore: \['\*\*\/cross-browser\.spec\.js', '\*\*\/deployed\/\*\*'\]/);
  assert.match(siteConfig, /failOnFlakyTests: true/);
  assert.match(journey, /route\.abort\('blockedbyclient'\)/);
  assert.doesNotMatch(journey, /request\.(?:post|put|patch|delete)\(/);
});

test('every tracked nonvisual site audit is selected by the site-audit command', () => {
  const expected = readdirSync(new URL('../audits/', import.meta.url))
    .filter((file) => file.endsWith('.spec.js') && file !== 'visual-regression.spec.js')
    .sort();
  const command = packageJson.scripts['test:site-audit'];
  assert.equal(typeof command, 'string');
  for (const file of expected) {
    assert.match(command, new RegExp(`audits/${escapeRegex(file)}(?:\\s|$)`));
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
