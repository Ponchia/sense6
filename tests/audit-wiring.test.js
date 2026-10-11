import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
  REPRESENTATIVE_ROUTES,
  SEARCH_REPRESENTATIVE_ROUTES,
  SEARCH_ROUTES,
  SITE_ROUTES,
} from '../audits/routes.js';
import primaryConfig from '../playwright.config.js';
import deployedConfig from '../playwright.deployed.config.js';
import siteConfig from '../playwright.site.config.js';
import { EXAMS } from '../src/exams/registry.js';
import { LEARN_PUBLISHED_LOCALES } from '../src/learn-publication.js';
import { LOCALES } from '../src/locale-metadata.js';
import { LEARN_ROUTES } from '../src/routes.js';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const WORKFLOW_DIRECTORY = new URL('../.github/workflows/', import.meta.url);
const workflowNames = readdirSync(WORKFLOW_DIRECTORY)
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .sort();
const workflow = (name) => readFileSync(new URL(name, WORKFLOW_DIRECTORY), 'utf8');
const allWorkflows = workflowNames.map((file) => workflow(file)).join('\n');

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

const SELF_HOSTED_RUNNER = 'arc-vps-sense6';
const REPOSITORY = 'Ponchia/sense6';

/**
 * One github context per triggering event, enough to resolve every job-level
 * `if:` in this repository. A path absent from a context resolves to null, which
 * is what GitHub does for `github.event.pull_request.*` outside a pull request.
 */
const EVENT_CONTEXTS = Object.freeze({
  'fork pull request': {
    'github.event_name': 'pull_request',
    'github.repository': REPOSITORY,
    'github.event.pull_request.head.repo.full_name': 'outsider/sense6',
    'github.ref': 'refs/pull/99/merge',
  },
  'same-repository pull request': {
    'github.event_name': 'pull_request',
    'github.repository': REPOSITORY,
    'github.event.pull_request.head.repo.full_name': REPOSITORY,
    'github.ref': 'refs/pull/99/merge',
  },
  'push to main': {
    'github.event_name': 'push',
    'github.repository': REPOSITORY,
    'github.ref': 'refs/heads/main',
  },
  'scheduled run': {
    'github.event_name': 'schedule',
    'github.repository': REPOSITORY,
    'github.ref': 'refs/heads/main',
  },
  'manual dispatch': {
    'github.event_name': 'workflow_dispatch',
    'github.repository': REPOSITORY,
    'github.ref': 'refs/heads/main',
  },
});

/**
 * Which self-hosted jobs each event is allowed to start, as `workflow:job`.
 *
 * The fork entry is the security property: no job may reach the cluster runner
 * with head-revision code. The other entries are the other half — a guard that
 * also switched off the scheduled sweep or the push comparison would be a
 * regression, not a fix — so this table has to be updated deliberately whenever
 * a self-hosted job is added, removed, or re-gated.
 */
const SELF_HOSTED_REACH = Object.freeze({
  'fork pull request': [],
  'same-repository pull request': [
    'verify.yml:browser',
    'verify.yml:lighthouse',
    'verify.yml:release',
    'verify.yml:visual',
  ],
  'push to main': ['verify.yml:browser', 'verify.yml:lighthouse', 'verify.yml:release', 'verify.yml:visual'],
  'scheduled run': [
    'site-audit.yml:external-links',
    'site-audit.yml:lighthouse-full-site',
    'site-audit.yml:passive-security',
    'site-audit.yml:route-integrity',
  ],
  'manual dispatch': [
    'site-audit.yml:external-links',
    'site-audit.yml:lighthouse-full-site',
    'site-audit.yml:passive-security',
    'site-audit.yml:route-integrity',
    'verify.yml:browser',
    'verify.yml:lighthouse',
    'verify.yml:release',
    'verify.yml:visual',
  ],
});

test('pull request CI is an unprivileged verification-only caller', () => {
  const ci = workflow('ci.yml');

  assert.match(ci, /permissions:\n\s+contents: read/);
  assert.doesNotMatch(ci, /deployments:\s*write/);
  assert.doesNotMatch(ci, /deploy_target|deploy_branch/);
  assert.doesNotMatch(ci, /secrets:\s*inherit/);
  assert.doesNotMatch(allWorkflows, /pull_request_target/);
});

test('every self-hosted job is discovered by this model', () => {
  // The reachability assertions below are only as good as the parser: a job the
  // parser fails to see is a job whose guard is never checked. Count the runner
  // declarations in the workflow source and require the model to account for all
  // of them, so a reformat that defeats the parser fails loudly instead of
  // quietly reducing the security assertion to an empty set.
  const declared = allWorkflows.match(/^\s*runs-on: arc-vps-sense6$/gm) ?? [];
  const modelled = selfHostedJobs();
  assert.ok(declared.length > 0, 'the guard exists because of this runner');
  assert.equal(
    modelled.length,
    declared.length,
    `the workflow parser found ${modelled.length} of ${declared.length} arc-vps-sense6 jobs`,
  );
});

test('no job reaches the self-hosted runner from a fork pull request', () => {
  // `runs-on: arc-vps-sense6` is a runner inside the operator's netcup cluster,
  // and every job that uses it runs `npm ci` and `npm run build` on candidate
  // code — so an npm lifecycle script from the head revision executes there. The
  // repository is private today, but branch protection is impossible without
  // GitHub Pro and "make it public" is the obvious remedy, which would turn that
  // into remote code execution in the cluster.
  //
  // This walks the real job graph, including `uses: ./.github/workflows/...`
  // calls, and resolves each job-level `if:` against a fork pull request
  // context. It is deliberately not a text match for one guard in one file: a
  // new job with no guard, or a guard that admits a fork, fails here without
  // anyone remembering to extend a list.
  const exposed = reachableSelfHostedJobs('fork pull request');
  assert.deepEqual(
    exposed,
    [],
    `a fork pull request would build head-revision code on ${SELF_HOSTED_RUNNER} in: ${exposed.join(', ')}`,
  );

  // The guard's literal text is pinned too, because the walk above proves only
  // that the current expressions exclude a fork — not that anybody still intends
  // them to.
  assert.match(workflow('ci.yml'), /head\.repo\.full_name == github\.repository/);
});

test('the fork guard does not disable the trusted runs', () => {
  // A guard that also stopped the scheduled sweep, the push comparison, or the
  // same-repository pull request gate would be a regression dressed as a fix.
  for (const [event, expected] of Object.entries(SELF_HOSTED_REACH)) {
    assert.deepEqual(
      reachableSelfHostedJobs(event),
      expected,
      `${event} no longer starts the expected set of ${SELF_HOSTED_RUNNER} jobs`,
    );
  }
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
  const release = parseWorkflow('verify.yml').jobs.find((job) => job.id === 'release');
  assert.ok(release, 'verify.yml no longer has a release job');
  const steps = release.lines.flatMap((line) => line.match(/^ {6}- name: (.+)$/)?.[1] ?? []);
  const index = (needle) => steps.findIndex((name) => name.includes(needle));

  const build = index('build the production artifact');
  const generate = index('Stamp and checksum');
  const htmlLinks = index('Validate generated HTML and links');
  const localJourney = index('JavaScript journey against the local artifact');
  const siteAudit = index('Audit the production artifact');
  const check = index('unchanged since it was checksummed');
  const publish = index('Publish the verified production bundle');
  const liveCommit = index('live production commit');
  const liveJourney = index('Verify the deployed JavaScript journey');

  for (const [label, position] of Object.entries({
    build,
    generate,
    htmlLinks,
    localJourney,
    siteAudit,
    check,
    publish,
    liveCommit,
    liveJourney,
  })) {
    assert.notEqual(position, -1, `verify.yml's release job is missing the ${label} step`);
  }

  // Runs 29904179754 and 30445054721 published successfully and then failed the
  // journey, leaving a failing build live with re-publishing the same commit as
  // the only remedy. The journey against the local artifact must therefore run
  // before the upload.
  assert.ok(localJourney < publish, 'the local journey must run before the publish step');

  // The checksum pair attests one property: the bytes that were audited are the
  // bytes that were published. That needs BOTH halves, and each half is useless
  // alone.
  //
  // Half one — the stamp is taken at the first moment `dist` exists, so every
  // verification step falls inside the attested window. An earlier revision of
  // this test asserted only half two, and the job satisfied it by moving the
  // verification steps ABOVE the stamp: generation was then immediately followed
  // by the check, which is a comparison of a file with itself and cannot fail.
  // If you are here because these assertions are in your way, the property to
  // preserve is "a real step that could mutate dist runs between the two", not
  // "the two steps are in some order".
  assert.equal(
    build + 1,
    generate,
    'the checksum must be stamped immediately after the build, so that nothing which follows is ' +
      'outside the attested window',
  );
  for (const [label, position] of Object.entries({ htmlLinks, localJourney, siteAudit })) {
    assert.ok(
      generate < position && position < check,
      `the ${label} step must run between the checksum stamp and the re-check; a re-check with ` +
        'nothing verified in between attests nothing',
    );
  }
  assert.ok(
    generate < localJourney && localJourney < siteAudit && siteAudit < check,
    'required order: stamp the checksum, verify the artifact, then re-check it',
  );

  // Half two — the re-check is the last thing before the upload, so no step can
  // slip in and change dist after it was attested and before it shipped.
  assert.ok(check < publish, 'the artifact checksum must be re-checked before publishing');
  assert.equal(check + 1, publish, 'nothing may run between the checksum check and the upload');
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
  assert.match(verify, /needs: \[browser, lighthouse, visual\]/);
  assert.doesNotMatch(
    siteAudit,
    /^ {2}lighthouse:$/m,
    'the gating Lighthouse job belongs in verify.yml, not in an unrelated workflow',
  );
});

test('the visual comparison gates pull requests and direct pushes', () => {
  // The comparison used to race the deployment from site-audit.yml, so a red
  // result could arrive after production had already published. It now belongs
  // to the reusable verifier and is a hard release dependency.
  const verify = workflow('verify.yml');
  for (const event of ['push to main', 'same-repository pull request']) {
    assert.ok(
      reachableSelfHostedJobs(event).includes('verify.yml:visual'),
      `the visual comparison must run for a ${event}`,
    );
  }
  assert.match(verify, /needs: \[browser, lighthouse, visual\]/);
  assert.match(verify, /audits\/visual-baseline-approvals\.txt/);
  assert.match(verify, /scripts\/read-visual-approvals\.mjs/);
  assert.match(verify, /name: Read the visual approvals introduced by this revision/);
  assert.doesNotMatch(
    verify,
    /git diff --name-only .*visual-regression\.spec\.js-snapshots/,
    'approvals must not be derived from the baselines they approve',
  );
});

test('visual-approved diffs preserve evidence with bounded artifact retention', () => {
  const verify = workflow('verify.yml');
  const visual = readFileSync(new URL('../audits/visual-regression.spec.js', import.meta.url), 'utf8');
  assert.match(verify, /if: failure\(\) \|\| steps\.visual-baselines\.outputs\.approved != ''/);
  assert.match(verify, /name: visual-regression-playwright-report[\s\S]*?retention-days: 7/);
  for (const label of ['base revision', 'candidate', 'diff']) {
    assert.ok(visual.includes(`(${label})`), `missing ${label} review image`);
  }
  assert.doesNotMatch(visual, /\['diff', 'actual', 'expected'\]/);
  assert.match(visual, /if \(!diff\)\s*\{\s*throw new Error/);
  assert.match(visual, /The approved change cannot be reviewed without the difference image/);
});

test('successful unchanged visual checks do not consume artifact storage', () => {
  const verify = workflow('verify.yml');

  assert.match(verify, /if: failure\(\) \|\| steps\.visual-baselines\.outputs\.approved != ''/);
  assert.doesNotMatch(allWorkflows, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.match(allWorkflows, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7\.0\.1/);
});

test('PR smoke spans every instrument while production runs the full browser matrix', () => {
  const verify = workflow('verify.yml');
  assert.match(verify, /name: Verify representative browser journeys for pull requests/);
  assert.ok(verify.includes('if: $' + '{{ !inputs.publish_production }}'));
  assert.match(verify, /run: npm run test:pr-smoke/);
  assert.match(verify, /name: Verify every browser project before production/);
  assert.ok(verify.includes('if: $' + '{{ inputs.publish_production }}'));

  const smokeCommand = packageJson.scripts['test:pr-smoke'];
  for (const project of ['chromium', 'mobile', 'chromium-smoke', 'firefox', 'webkit']) {
    assert.ok(smokeCommand.includes(`--project=${project}`));
    assert.ok(verify.includes(`--project=${project}`), `production matrix missing ${project}`);
  }
  assert.match(smokeCommand, /--grep @pr-smoke/);
  assert.match(smokeCommand, /--workers=1/);
  assert.match(verify, /--workers=1/);

  // The fast gate must not silently drop whole instruments or the built-
  // artifact engine handover. Keep the selected journeys explicit in tests.
  for (const name of [
    'app',
    'tetracromia',
    'daltonia',
    'riflessi',
    'udito',
    'acutezza',
    'journal',
    'cross-browser',
  ]) {
    const source = readFileSync(new URL(`${name}.spec.js`, import.meta.url), 'utf8');
    assert.match(source, /test\('.*@pr-smoke'/, `${name} has no PR smoke journey`);
  }
});

test('browser-matrix failures preserve uniquely named diagnostics', () => {
  const verify = workflow('verify.yml');

  assert.match(verify, /name: Preserve browser-matrix failure artifacts\n\s+if: failure\(\)/);
  assert.match(verify, /browser-matrix-report-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.match(verify, /playwright-report\n\s+test-results/);
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

test('the cross-browser matrix runs against the built artifact, not the dev server', () => {
  // `vite.config.js` has no SPA-fallback override, so under `npm run dev` every
  // localized route fell back to the raw root index.html and no browser ever
  // loaded a pre-rendered static page. Firefox and WebKit run nothing else, so
  // that was the whole of their coverage.
  assert.ok(Array.isArray(primaryConfig.webServer), 'the matrix needs a dev and an artifact server');
  const [dev, artifact] = primaryConfig.webServer;
  assert.match(dev.command, /npm run dev/);
  assert.match(artifact.command, /npm run build/);
  assert.match(artifact.command, /serve-deployed-smoke\.mjs/);
  assert.notEqual(dev.url, artifact.url, 'the two servers must not share a port');
  for (const server of primaryConfig.webServer) {
    assert.equal(server.reuseExistingServer, false);
  }
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
  // Every cross-browser project must point at the artifact server, and the
  // fixture-driven projects at the dev server. The accelerated instrument
  // fixtures sit behind `import.meta.env.DEV` AND a
  // `/^(localhost|127\.0\.0\.1)$/` hostname test — `runtimeConfig()` in
  // src/exams/acutezza.js:1069, src/exams/riflessi.js:1033 and
  // src/exams/udito.js:1067, and `adaptiveRunEntropy()` in
  // src/exams/color-blindness.js:738. Vite compiles `import.meta.env.DEV` to
  // false in a production build, so a fixture-driven suite cannot run against
  // dist until that hook is visible in the shipped bundle.
  for (const name of ['chromium-smoke', 'firefox', 'webkit']) {
    assert.equal(projects[name].testMatch, '**/cross-browser.spec.js');
    assert.equal(projects[name].use.baseURL, artifact.url);
  }
  for (const name of ['chromium', 'mobile']) {
    assert.equal(projects[name].use.baseURL, dev.url);
  }
});

test('the cross-browser suite uses no accelerated fixture', () => {
  // If it ever did, it would silently fall back to the full-length protocol
  // against dist, because the fixture hooks are compiled out of production.
  const suite = readFileSync(new URL('../tests/cross-browser.spec.js', import.meta.url), 'utf8');
  assert.doesNotMatch(suite, /__SENSE6_TEST_CONFIG__|__SENSORIA_TEST_CONFIG__/);
});

test('the visual comparison covers a pinned set of representative routes', () => {
  // Visual coverage used to be pinned by accident: every covered route had a
  // committed baseline PNG, so dropping a route meant deleting a binary file and
  // showing two conspicuous deletions in the diff. The baselines are regenerated
  // from the base revision now — correctly, they were inert — which left the
  // route set held by nothing at all. audits/routes.js:REPRESENTATIVE_ROUTES is
  // one line, and it derives from src/exams/registry.js, so a route could lose
  // its visual comparison as an invisible side effect of an unrelated change.
  //
  // Update this list only when you mean to change what the visual suite covers.
  assert.deepEqual(
    [...REPRESENTATIVE_ROUTES],
    [
      '/',
      '/en/',
      '/en/learn/',
      '/en/color-blindness-guide/',
      '/en/tetracromia/',
      '/en/color-blindness/',
      '/en/riflessi/',
      '/en/udito/',
      '/en/acutezza/',
      '/en/about/',
      '/en/journal/',
      '/en/privacy/',
      '/ar/about/',
      '/hi/about/',
      '/ja/about/',
    ],
    'the visual comparison route set changed; every exam and utility route needs a desktop and a ' +
      'mobile comparison, and a removal has to be a deliberate edit here',
  );
});

test('Lighthouse audits the indexable route set instead of penalizing deliberate noindex pages', () => {
  const guides = LEARN_PUBLISHED_LOCALES.length * LEARN_ROUTES.length;
  // Indexable guides exist only for fully published locales. The three utility
  // routes include the deliberately nonindexed journal and privacy pages.
  assert.equal(SITE_ROUTES.length, 1 + LOCALES.length * (EXAMS.length + 4) + guides);
  assert.equal(SEARCH_ROUTES.length, 1 + LOCALES.length * (EXAMS.length + 2) + guides);
  assert.ok(SEARCH_ROUTES.every((route) => !/\/(?:journal|privacy)\/$/.test(route)));
  assert.ok(SEARCH_REPRESENTATIVE_ROUTES.every((route) => SEARCH_ROUTES.includes(route)));
  assert.ok(!SEARCH_REPRESENTATIVE_ROUTES.includes('/en/journal/'));
  assert.ok(!SEARCH_REPRESENTATIVE_ROUTES.includes('/en/privacy/'));
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

// -----------------------------------------------------------------------------
// A small workflow model.
//
// A workflow is data, and the questions above are about its job graph: which
// jobs a given event starts, which of those reach the self-hosted runner, and
// which reusable workflow they call. There is no YAML parser in this project's
// dependency set, so this reads the parts of the schema these files actually use
// and throws on anything it does not recognise — a parse failure has to be loud,
// because a parser that silently sees no jobs turns a security assertion into an
// empty set.
// -----------------------------------------------------------------------------

/** @param {string} source @param {string} key */
function topLevelSection(source, key) {
  const lines = source.split('\n');
  const start = lines.indexOf(`${key}:`);
  if (start === -1) throw new Error(`workflow has no block-style \`${key}:\` mapping`);
  const body = [];
  for (let index = start + 1; index < lines.length && !/^\S/.test(lines[index]); index += 1) {
    body.push(lines[index]);
  }
  return body;
}

/** @param {string} name */
function parseWorkflow(name) {
  const source = workflow(name);
  const triggers = new Set(
    topLevelSection(source, 'on').flatMap((line) => line.match(/^ {2}([\w-]+):/)?.[1] ?? []),
  );
  if (triggers.size === 0) throw new Error(`${name} declares no recognisable trigger`);

  /** @type {{ id: string, lines: string[] }[]} */
  const blocks = [];
  for (const line of topLevelSection(source, 'jobs')) {
    const header = line.match(/^ {2}([\w-]+):$/);
    if (header) blocks.push({ id: header[1], lines: [] });
    else blocks.at(-1)?.lines.push(line);
  }
  if (blocks.length === 0) throw new Error(`${name} declares no recognisable job`);

  return {
    name,
    triggers,
    jobs: blocks.map((block) => ({
      id: block.id,
      lines: block.lines,
      runsOn: jobField(block.lines, 'runs-on'),
      uses: jobField(block.lines, 'uses'),
      if: jobCondition(block.lines),
    })),
  };
}

/** A job-level key, at four spaces — step-level keys are indented deeper. */
function jobField(lines, key) {
  const prefix = `    ${key}: `;
  const line = lines.find((candidate) => candidate.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}

/** A job-level `if:`, joining a folded (`>-`) expression into one line. */
function jobCondition(lines) {
  const start = lines.findIndex((line) => /^ {4}if:/.test(line));
  if (start === -1) return null;
  const parts = [lines[start].replace(/^ {4}if:/, '').trim()];
  for (let index = start + 1; index < lines.length && /^ {6}\S/.test(lines[index]); index += 1) {
    parts.push(lines[index].trim());
  }
  const folded = parts.join(' ').replace(/^>-?\s*/, '');
  return folded.replace(/\s+/g, ' ').trim();
}

function selfHostedJobs() {
  return workflowNames
    .flatMap((name) => parseWorkflow(name).jobs.map((job) => ({ ...job, workflow: name })))
    .filter((job) => job.runsOn === SELF_HOSTED_RUNNER);
}

/**
 * Which `workflow:job` identifiers on the self-hosted runner a named event can
 * start, following `uses: ./.github/workflows/...` into reusable workflows.
 * @param {string} event a key of EVENT_CONTEXTS
 */
function reachableSelfHostedJobs(event) {
  const context = EVENT_CONTEXTS[event];
  if (!context) throw new Error(`unknown event ${event}`);
  const trigger = context['github.event_name'];
  const reached = new Set();

  /** @param {string} name @param {boolean} called @param {number} depth */
  const visit = (name, called, depth) => {
    if (depth > 4) throw new Error(`workflow_call chain from ${name} is suspiciously deep`);
    const parsed = parseWorkflow(name);
    if (!called && !parsed.triggers.has(trigger)) return;
    for (const job of parsed.jobs) {
      if (job.if && !truthy(evaluateExpression(job.if, context))) continue;
      if (job.uses) visit(job.uses.replace(/^\.\/\.github\/workflows\//, ''), true, depth + 1);
      else if (job.runsOn === SELF_HOSTED_RUNNER) reached.add(`${name}:${job.id}`);
    }
  };

  for (const name of workflowNames) visit(name, false, 0);
  return [...reached].sort();
}

/**
 * Resolve the subset of the GitHub expression syntax these workflows use:
 * string literals, `github.*` references, `==`, `!=`, `&&`, `||`, and grouping.
 * Anything else throws, so an unmodelled expression fails the test rather than
 * resolving to a comfortable answer.
 * @param {string} expression @param {Record<string, string>} context
 */
function evaluateExpression(expression, context) {
  const tokenPattern = /'[^']*'|==|!=|\|\||&&|[()]|[\w.-]+/g;
  const residue = expression.replace(tokenPattern, '').trim();
  if (residue) throw new Error(`unsupported expression syntax ${JSON.stringify(residue)} in ${expression}`);
  const state = { tokens: expression.match(tokenPattern) ?? [], index: 0, context };
  const value = parseDisjunction(state);
  if (state.index !== state.tokens.length) throw new Error(`trailing tokens in ${expression}`);
  return value;
}

// `&&` binds tighter than `||`, and both operands are always parsed before they
// are combined: short-circuiting the evaluation would also short-circuit the
// tokens, leaving the tail of the expression unread and reported as a syntax
// error.
function parseDisjunction(state) {
  let value = parseConjunction(state);
  while (state.tokens[state.index] === '||') {
    state.index += 1;
    const right = parseConjunction(state);
    value = truthy(value) || truthy(right);
  }
  return value;
}

function parseConjunction(state) {
  let value = parseComparison(state);
  while (state.tokens[state.index] === '&&') {
    state.index += 1;
    const right = parseComparison(state);
    value = truthy(value) && truthy(right);
  }
  return value;
}

function parseComparison(state) {
  const left = parseTerm(state);
  const operator = state.tokens[state.index];
  if (operator !== '==' && operator !== '!=') return left;
  state.index += 1;
  const equal = left === parseTerm(state);
  return operator === '==' ? equal : !equal;
}

function parseTerm(state) {
  const token = state.tokens[state.index];
  state.index += 1;
  if (token === '(') {
    const value = parseDisjunction(state);
    if (state.tokens[state.index] !== ')') throw new Error('unbalanced parentheses in a job condition');
    state.index += 1;
    return value;
  }
  if (token?.startsWith("'")) return token.slice(1, -1);
  if (token === 'true' || token === 'false') return token === 'true';
  // An absent property of the github context is null, which is how a pull
  // request property behaves on a push, a schedule, or a manual dispatch.
  if (token?.startsWith('github.')) return token in state.context ? state.context[token] : null;
  throw new Error(`unsupported reference ${token}; extend EVENT_CONTEXTS to model it`);
}

function truthy(value) {
  return value !== null && value !== false && value !== '' && value !== 0;
}
