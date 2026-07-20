import assert from 'node:assert/strict';
import test from 'node:test';
import { renderInstrumentList, renderMethodSteps, renderResearchSection } from '../src/exams/landing.js';

test('method steps own numbering and escape authored copy', () => {
  const html = renderMethodSteps([
    { title: 'First <step>', body: 'Keep A & B separate.' },
    { title: 'Second', body: 'Finish safely.' },
  ]);
  assert.match(html, /<span>1<\/span>/);
  assert.match(html, /<span>2<\/span>/);
  assert.match(html, /First &lt;step&gt;/);
  assert.match(html, /Keep A &amp; B separate\./);
});

test('research sections preserve the shared structure and safe links', () => {
  const html = renderResearchSection({
    className: 'example-research',
    titleId: 'example-title',
    title: 'What informed the example.',
    description: 'Evidence shapes it.',
    label: 'Research trail',
    sources: [['A & B', 'https://example.com/?a=1&b=2']],
  });
  assert.match(html, /aria-labelledby="example-title"/);
  assert.match(html, /class="science example-research section/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.match(html, /target="_blank" rel="noreferrer"/);
});

test('instrument lists share structure without constraining experiment visuals', () => {
  const html = renderInstrumentList(
    {
      signal: {
        number: '01',
        name: 'Signal',
        eyebrow: 'Response',
        body: 'Wait, then respond.',
      },
    },
    { classPrefix: 'rx', visual: (id) => `<i data-id="${id}"></i>` },
  );
  assert.match(html, /class="rx-instrument-list"/);
  assert.match(html, /class="rx-instrument-visual rx-instrument-visual--signal"/);
  assert.match(html, /<i data-id="signal"><\/i>/);
});
