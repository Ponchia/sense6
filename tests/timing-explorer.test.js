import assert from 'node:assert/strict';
import test from 'node:test';
import { timingExplorerMarkup } from '../src/timing-explorer.js';
import {
  compareTimingScenarios,
  defaultTimingConfiguration,
  isTimingConfiguration,
  refreshInterval,
  TIMING_EXPLORER_URL,
  timingConfigurationFromSearch,
  timingConfigurationLink,
} from '../src/timing-explorer-model.js';

test('the resource leads with a concise honest answer and accessible next steps', () => {
  const html = timingExplorerMarkup();
  assert.match(html, /<strong>Short answer:<\/strong>/);
  assert.match(html, /the comparison below is a separate fictional teaching model/);
  assert.ok(html.indexOf('Try the real short reaction task') < html.indexOf('id="timing-comparison"'));
  assert.ok(html.includes('href="/education/browser-reaction-time/"'));
});

test('comparison isolates assumed setup contributions while the person stays constant', () => {
  const initial = defaultTimingConfiguration();
  assert.deepEqual(compareTimingScenarios(initial), {
    intervalA: 248,
    intervalB: 232,
    difference: -16,
    refreshA: 1000 / 60,
    refreshB: 1000 / 120,
  });
  const slowerInput = { ...initial, b: { ...initial.b, input: 20 } };
  assert.equal(compareTimingScenarios(slowerInput).difference, 0);
  const samePersonChange = { ...initial, response: 300 };
  assert.equal(compareTimingScenarios(samePersonChange).intervalA, 328);
  assert.equal(compareTimingScenarios(samePersonChange).intervalB, 312);
  assert.equal(compareTimingScenarios(samePersonChange).difference, -16);
});

test('refresh intervals are arithmetic and never double-counted as latency', () => {
  assert.equal(refreshInterval(60), 1000 / 60);
  assert.equal(refreshInterval(120), 1000 / 120);
  assert.equal(refreshInterval(144).toFixed(2), '6.94');
  const configuration = defaultTimingConfiguration();
  configuration.a.hz = 240;
  const result = compareTimingScenarios(configuration);
  assert.equal(result.refreshA, 1000 / 240);
  assert.equal(result.intervalA, 248);
  assert.equal(result.difference, -16);
  for (const invalid of [0, -60, 59.9, 1000, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => refreshInterval(invalid), RangeError);
  }
});

test('simulation ranges are bounded and defaults are independent copies', () => {
  const first = defaultTimingConfiguration();
  first.a.input = 99;
  assert.equal(defaultTimingConfiguration().a.input, 12);
  const low = { response: 100, a: { display: 0, input: 0, hz: 30 }, b: { display: 0, input: 0, hz: 240 } };
  const high = {
    response: 500,
    a: { display: 100, input: 100, hz: 30 },
    b: { display: 100, input: 100, hz: 240 },
  };
  assert.equal(compareTimingScenarios(low).intervalA, 100);
  assert.equal(compareTimingScenarios(high).intervalB, 700);
  for (const invalid of [
    null,
    {},
    [],
    { ...first, response: 99 },
    { ...first, response: 500.5 },
    { ...first, a: { ...first.a, input: 101 } },
    { ...first, b: { ...first.b, display: -1 } },
    { ...first, a: { ...first.a, hz: '60' } },
  ]) {
    assert.equal(isTimingConfiguration(invalid), false);
    assert.throws(() => compareTimingScenarios(invalid), RangeError);
    assert.throws(() => timingConfigurationLink(invalid), RangeError);
  }
});

test('explicit share links round-trip only complete, valid fictional inputs', () => {
  const configuration = {
    response: 357,
    a: { display: 0, input: 100, hz: 75 },
    b: { display: 81, input: 7, hz: 165 },
  };
  const link = timingConfigurationLink(configuration);
  const url = new URL(link);
  assert.equal(url.origin + url.pathname, TIMING_EXPLORER_URL);
  assert.deepEqual([...url.searchParams.keys()], ['response', 'ad', 'ai', 'ahz', 'bd', 'bi', 'bhz']);
  assert.deepEqual(timingConfigurationFromSearch(url.search), { configuration, state: 'shared' });
  const withUnrelated = timingConfigurationFromSearch(`${url.search}&metrics=off&result=secret&locale=ar`);
  assert.equal(withUnrelated.state, 'shared');
  assert.equal(timingConfigurationLink(withUnrelated.configuration), link);
  assert.deepEqual(timingConfigurationFromSearch('?metrics=off'), {
    configuration: defaultTimingConfiguration(),
    state: 'default',
  });
});

test('ambiguous, incomplete or malformed shared examples restore the full default', () => {
  const valid = new URL(timingConfigurationLink(defaultTimingConfiguration())).search;
  const invalid = [
    '?response=220',
    `${valid}&response=220`,
    valid.replace('ad=16', 'ad=-1'),
    valid.replace('ai=12', 'ai=12.5'),
    valid.replace('ahz=60', 'ahz=0'),
    valid.replace('response=220', 'response=999'),
    valid.replace('bd=8', 'bd=08'),
    valid.replace('bi=4', 'bi=4e1'),
    valid.replace('bi=4', 'bi=Infinity'),
    valid.replace('ad=16', 'ad=%3Cscript%3E'),
    '?'.padEnd(2049, 'x'),
  ];
  for (const search of invalid) {
    assert.deepEqual(
      timingConfigurationFromSearch(search),
      { configuration: defaultTimingConfiguration(), state: 'invalid' },
      search,
    );
  }
});

test('static page provides the worked example, honest boundary and an ungated activity', () => {
  const html = timingExplorerMarkup();
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  assert.match(html, /data-timing-total="a">248/);
  assert.match(html, /data-timing-total="b">232/);
  assert.match(html, /Scenario B is 16 ms shorter/);
  assert.match(html, /not an average or a target/);
  assert.match(html, /not a measured display delay and is not added to the total/);
  assert.match(html, /id="timing-activity"/);
  assert.match(html, /<caption>Hypothetical observations/);
  assert.match(html, /simulation-only path/);
  assert.match(html, /href="\/en\/riflessi\/\?scope=signal"/);
  assert.match(html, /data-timing-comparison aria-live="polite"/);
  assert.equal((html.match(/data-timing-control=/g) ?? []).length, 7);
  assert.equal((html.match(/data-timing-control="[^"]+"[^>]*disabled/g) ?? []).length, 7);
  assert.doesNotMatch(html, /onclick=|javascript:|undefined|NaN/);
});

test('only the comparison output announces updates and sliders expose milliseconds', () => {
  const html = timingExplorerMarkup();
  const outputs = [...html.matchAll(/<output\b[^>]*>/g)].map(([tag]) => tag);
  const comparison = outputs.filter((tag) => tag.includes('data-timing-comparison'));
  const auxiliary = outputs.filter((tag) => !tag.includes('data-timing-comparison'));
  assert.equal(comparison.length, 1);
  assert.match(comparison[0], /aria-live="polite"/);
  assert.equal(auxiliary.length, 9);
  for (const tag of auxiliary) assert.match(tag, /aria-live="off"/);
  const ranges = [...html.matchAll(/<input\b[^>]*type="range"[^>]*>/g)].map(([tag]) => tag);
  assert.equal(ranges.length, 5);
  for (const tag of ranges) {
    const value = tag.match(/\bvalue="(\d+)"/)[1];
    assert.ok(tag.includes(`aria-valuetext="${value} milliseconds"`));
  }
});
