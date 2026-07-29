import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import primaryConfig from '../playwright.config.js';
import deployedConfig from '../playwright.deployed.config.js';
import siteConfig from '../playwright.site.config.js';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const workflow = (name) => readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');
const allWorkflows = readdirSync(new URL('../.github/workflows/', import.meta.url))
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .map((file) => workflow(file))
  .join('\n');

// -----------------------------------------------------------------------------
// Workflow privilege tripwires.
//
// These deliberately match workflow source text. A workflow is data, not code
// we can import and resolve, and the point of these assertions is to notice the
// moment a privileged trigger or a secret grant appears anywhere in the tree.
//
// The Playwright assertions further down used to work the same way — matching
// another file's literal source, so that a semantically identical reformat
// failed while a genuinely wrong value elsewhere in the same file passed. Those
// now import the configs and assert the resolved objects.
// -----------------------------------------------------------------------------

test('pull request CI is an unprivileged verification-only caller', () => {
  const ci = workflow('ci.yml');

  assert.match(ci, /permissions:\n\s+contents: read/);
  assert.doesNotMatch(ci, /deployments:\s*write/);
  assert.doesNotMatch(ci, /deploy_target|deploy_branch/);
  assert.doesNotMatch(ci, /secrets:\s*inherit/);
  assert.doesNotMatch(allWorkflows, /pull_request_target/);
});

test('the self-hosted runner is not reachable from a fork pull request', () => {
  // `runs-on: arc-vps-sense6` is a runner inside the operator's cluster. The
  // repository is private today, but branch protection is impossible without
  // GitHub Pro and "make it public" is the obvious remedy — at which point a
  // missing head-repository guard would hand fork pull requests code execution
  // in that cluster. This assertion is what keeps the guard in place.
  const ci = workflow('ci.yml');
  assert.match(ci, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(allWorkflows, /runs-on: arc-vps-sense6/, 'the guard exists because of this runner');
});

test('the reusable verifier cannot publish pull request previews', () => {
  const verify = workflow('verify.yml');
  const deploy = workflow('deploy.yml');

  assert.doesNotMatch(verify, /deploy_target == 'preview'/);
  assert.doesNotMatch(verify, /Publish the verified preview/);
  assert.doesNotMatch(verify, /Smoke-test the real preview/);
  assert.doesNotMatch(verify, /^permissions:/m);
  assert.match(deploy, /permissions:\n\s+contents: read\n\s+deployments: write/);
  assert.match(deploy, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(deploy, /publish_production: true/);
});

test('the deployed browser journey is verified before publication, not only after', () => {
  const verify = workflow('verify.yml');
  const steps = [...verify.matchAll(/^ {6}- name: (.+)$/gm)].map(([, name]) => name);
  const index = (needle) => steps.findIndex((name) => name.includes(needle));

  const localJourney = index('JavaScript journey against the local artifact');
  const checksum = index('unchanged since it was checksummed');
  const publish = index('Publish the verified production bundle');
  const liveCommit = index('live production commit');
  const liveJourney = index('Verify the deployed JavaScript journey');

  for (const [label, position] of Object.entries({
    localJourney,
    checksum,
    publish,
    liveCommit,
    liveJourney,
  })) {
    assert.notEqual(position, -1, `verify.yml is missing the ${label} step`);
  }

  // Runs 29904179754 and 30445054721 published successfully and then failed the
  // journey, leaving a failing build live with re-publishing the same commit as
  // the only remedy. The journey against the local artifact must therefore run
  // first, and the checksum re-check must sit immediately before the upload so
  // that it attests something.
  assert.ok(localJourney < publish, 'the local journey must run before the publish step');
  assert.ok(checksum < publish, 'the artifact checksum must be re-checked before publishing');
  assert.equal(checksum + 1, publish, 'nothing may run between the checksum check and the upload');
  assert.ok(publish < liveCommit && liveCommit < liveJourney);

  assert.match(verify, /PLAYWRIGHT_DEPLOYED_URL: https:\/\/sense6\.net/);
  assert.match(verify, /playwright-report\/deployed/);
  assert.match(verify, /test-results\/deployed/);
});

test('the Lighthouse budget can stop a deploy', () => {
  const verify = workflow('verify.yml');
  const siteAudit = workflow('site-audit.yml');

  // The budget used to live only in site-audit.yml, which has no `needs` or
  // `workflow_run` relation to deploy.yml, so its failure could not block a
  // publish and the two jobs merely raced.
  assert.match(verify, /^ {2}lighthouse:$/m);
  assert.match(verify, /npm run audit:lighthouse/);
  assert.match(verify, /needs: \[browser, lighthouse\]/);
  assert.doesNotMatch(
    siteAudit,
    /^ {2}lighthouse:$/m,
    'the gating Lighthouse job belongs in verify.yml, not in an unrelated workflow',
  );
});

test('the visual comparison also runs on a direct push to main', () => {
  // Branch protection is impossible on this repository, so a push to main
  // deploys without any pull request gate at all.
  const siteAudit = workflow('site-audit.yml');
  assert.match(siteAudit, /if: github\.event_name == 'pull_request' \|\| github\.event_name == 'push'/);
  assert.match(siteAudit, /audits\/visual-baseline-approvals\.txt/);
  assert.doesNotMatch(
    siteAudit,
    /git diff --name-only .*visual-regression\.spec\.js-snapshots/,
    'approvals must not be derived from the baselines they approve',
  );
});

test('the deployed browser configuration refuses any host but production', () => {
  assert.equal(deployedConfig.workers, 1);
  assert.equal(deployedConfig.fullyParallel, false);
  assert.equal(deployedConfig.forbidOnly, true);
  assert.equal(deployedConfig.failOnFlakyTests, true);
  assert.equal(deployedConfig.retries, process.env.CI ? 1 : 0);
  assert.equal(deployedConfig.use.trace, 'retain-on-failure');
  assert.equal(deployedConfig.use.screenshot, 'only-on-failure');
  assert.equal(deployedConfig.use.video, 'retain-on-failure');
  assert.equal(deployedConfig.testDir, './tests/deployed');
  assert.equal(deployedConfig.outputDir, 'test-results/deployed');

  // With PLAYWRIGHT_DEPLOYED_URL unset the config serves the local dist, which
  // is what makes the pre-publish gate possible.
  assert.equal(typeof deployedConfig.webServer, 'object');
  assert.match(deployedConfig.webServer.command, /serve-deployed-smoke\.mjs/);
  assert.match(deployedConfig.use.baseURL, /^http:\/\/127\.0\.0\.1:\d+$/);
});

test('the browser matrix runs against the built artifact, not the dev server', () => {
  // `vite.config.js` has no SPA-fallback override, so under `npm run dev` every
  // localized route fell back to the raw root index.html and no browser ever
  // loaded a pre-rendered static page.
  assert.match(primaryConfig.webServer.command, /serve-deployed-smoke\.mjs/);
  assert.match(primaryConfig.webServer.command, /npm run build/);
  assert.doesNotMatch(primaryConfig.webServer.command, /npm run dev/);
  assert.equal(primaryConfig.webServer.reuseExistingServer, false);
  assert.equal(primaryConfig.forbidOnly, true);
  assert.equal(primaryConfig.retries, 0);

  const projects = Object.fromEntries(primaryConfig.projects.map((project) => [project.name, project]));
  assert.deepEqual(Object.keys(projects).sort(), [
    'chromium',
    'chromium-smoke',
    'firefox',
    'mobile',
    'webkit',
  ]);
  for (const name of ['chromium', 'mobile']) {
    assert.deepEqual(projects[name].testIgnore, ['**/cross-browser.spec.js', '**/deployed/**']);
  }
  for (const name of ['chromium-smoke', 'firefox', 'webkit']) {
    assert.equal(projects[name].testMatch, '**/cross-browser.spec.js');
  }
});

test('the site audit keeps its regenerated visual baselines out of the repository', () => {
  assert.equal(siteConfig.failOnFlakyTests, true);
  assert.equal(siteConfig.forbidOnly, true);
  assert.equal(siteConfig.retries, process.env.CI ? 1 : 0);
  assert.match(siteConfig.snapshotPathTemplate, /^\{testDir\}\/\.\.\/test-results\//);
  assert.equal(
    readdirSync(new URL('../audits/', import.meta.url)).includes('visual-regression.spec.js-snapshots'),
    false,
    'baselines are regenerated from the base revision on every run; committing them is inert',
  );
});

test('the deployed journey never writes to production', () => {
  const journey = readFileSync(new URL('../tests/deployed/deployed.spec.js', import.meta.url), 'utf8');
  assert.match(journey, /route\.fulfill\(\{ status: 204, body: '' \}\)/);
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

test('the coverage gate scores every module in its include set', () => {
  // Without --all, c8 reports only the files the test process imported, so an
  // untested module is absent from the report rather than scored zero and can
  // never lower the published number.
  const command = packageJson.scripts['test:coverage'];
  assert.match(command, /--all\b/);
  assert.match(command, /--include='src\/lib\/\*\.js'/);
  assert.match(command, /--check-coverage/);
  assert.match(command, /check-coverage-report\.mjs/);
});

test('the static output check cannot validate a stale build', () => {
  assert.match(packageJson.scripts['test:static'], /smoke-dist-freshness\.mjs/);
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
