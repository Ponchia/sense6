import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeasurementPolicy } from '../src/measurement-policy.js';

test('only an explicit off flag opts an ordinary document out', () => {
  const allowed = createMeasurementPolicy({ search: '' });
  for (const search of ['', '?metrics=on', '?metrics=OFF', '?metrics=false', '?other=off']) {
    assert.equal(allowed({ search }), true, search);
  }
  assert.equal(allowed({ search: '?metrics=off' }), false);
  assert.equal(allowed({ search: '?metrics=on&metrics=off' }), false);
  assert.equal(allowed({ search: '?metrics=%6Fff' }), false);
  assert.equal(allowed({}), true);
  assert.equal(allowed(undefined), true);
});

test('initial exclusion survives router query removal for this document only', () => {
  const location = { search: '?metrics=off' };
  const allowed = createMeasurementPolicy(location);
  location.search = '';
  assert.equal(allowed(location), false);
  assert.equal(allowed({ search: '?metrics=on' }), false);
  assert.equal(createMeasurementPolicy(location)(location), true);
});
