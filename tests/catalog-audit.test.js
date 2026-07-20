import assert from 'node:assert/strict';
import test from 'node:test';

import { auditCatalog } from '../src/i18n/catalog-audit.js';

test('catalog audits report progress and contract drift separately', () => {
  const audit = auditCatalog({
    locale: 'it',
    catalog: new Map([
      ['Hello {name}', 'Ciao {name}'],
      ['Shared safety', 'Shared safety'],
      ['Unexpected', 'Inatteso'],
    ]),
    englishKeys: ['Hello {name}', 'Shared safety', 'Missing {count}'],
    messageSources: { 'boundary.shared': 'Shared safety', 'action.missing': 'Missing {count}' },
    rowCount: 4,
  });

  assert.ok(Math.abs(audit.progress - 100 / 3) < Number.EPSILON * 100);
  assert.deepEqual(audit.untranslated, ['Shared safety']);
  assert.deepEqual(audit.missing, ['Missing {count}']);
  assert.deepEqual(audit.extra, ['Unexpected']);
  assert.deepEqual(audit.missingStableIds, ['action.missing']);
  assert.equal(audit.duplicateRows, 1);
  assert.equal(audit.valid, false);
});

test('catalog audits detect placeholder drift and accept a complete catalog', () => {
  const drift = auditCatalog({
    locale: 'de',
    catalog: new Map([['Hello {name}', 'Hallo {person}']]),
    englishKeys: ['Hello {name}'],
    messageSources: {},
    rowCount: 1,
  });
  assert.deepEqual(drift.placeholderDrift, ['Hello {name}']);
  assert.equal(drift.valid, false);

  const complete = auditCatalog({
    locale: 'fr',
    catalog: new Map([['Hello {name}', 'Bonjour {name}']]),
    englishKeys: ['Hello {name}'],
    messageSources: { greeting: 'Hello {name}' },
    rowCount: 1,
  });
  assert.equal(complete.progress, 100);
  assert.equal(complete.valid, true);
});
