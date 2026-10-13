import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const REPOSITORY = 'https://github.com/Ponchia/sense6';
const SUPPORT = 'https://ko-fi.com/ponchia';
const PRIVATE_REPORT = `${REPOSITORY}/security/advisories/new`;
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const packageMetadata = JSON.parse(read('package.json'));

// These checks cover this repository's deliberately small declarations. Live
// Sponsor-button resolution and GitHub permissions need separate API readbacks.
test('funding declares only the maintained Ko-fi account and agrees with public metadata', () => {
  const lines = read('.github/FUNDING.yml')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(lines, ['ko_fi: ponchia']);
  assert.deepEqual(packageMetadata.funding, { type: 'ko-fi', url: SUPPORT });
  assert.ok(read('README.md').includes(`[Ko-fi](${SUPPORT})`));
  assert.match(read('README.md'), /Optional support[\s\S]*experiments remain free to use/);
});

test('package discovery metadata points to this public application without enabling npm publication', () => {
  assert.equal(packageMetadata.name, 'sense6');
  assert.equal(packageMetadata.private, true);
  assert.equal(packageMetadata.license, 'MIT');
  assert.equal(packageMetadata.homepage, 'https://sense6.net/');
  assert.deepEqual(packageMetadata.repository, { type: 'git', url: `git+${REPOSITORY}.git` });
  assert.deepEqual(packageMetadata.bugs, { url: `${REPOSITORY}/issues` });
  const lockedRoot = JSON.parse(read('package-lock.json')).packages[''];
  assert.equal(lockedRoot.name, packageMetadata.name);
  assert.equal(lockedRoot.version, packageMetadata.version);
  assert.equal(lockedRoot.license, packageMetadata.license);
  assert.deepEqual(lockedRoot.funding, packageMetadata.funding);
});

test('security entry points consistently direct sensitive reports to private reporting', () => {
  const issueConfiguration = read('.github/ISSUE_TEMPLATE/config.yml');
  assert.match(issueConfiguration, /^blank_issues_enabled: false$/m);
  assert.ok(issueConfiguration.includes(`url: ${PRIVATE_REPORT}`));
  assert.ok(read('SECURITY.md').includes(`(${PRIVATE_REPORT})`));
  assert.ok(read('CONTRIBUTING.md').includes('[SECURITY.md](SECURITY.md)'));
  const template = read('.github/PULL_REQUEST_TEMPLATE.md');
  assert.ok(template.includes(`${REPOSITORY}/blob/main/SECURITY.md`));
  assert.ok(template.includes(`${REPOSITORY}/blob/main/CONTRIBUTING.md`));
  assert.match(template, /Keep credentials, private journal exports, participant information/);
});

test('CODEOWNERS routes all files to the existing maintainer', () => {
  const rules = read('.github/CODEOWNERS')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(rules, ['* @Ponchia']);
});
