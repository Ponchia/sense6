import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { onRequest } from '../functions/api/metric.js';
import { isAllowedMetric, METRIC_EVENTS, METRIC_TESTS } from '../src/metrics.js';

const ORIGIN = 'https://sense6.net';
const MIGRATIONS = new URL('../migrations/', import.meta.url);

test('the forward metric migrations retain rows, the primary-key index, and all constraints', () => {
  const database = new DatabaseSync(':memory:');
  try {
    applyMigration(database, '0001_daily_metrics.sql');
    database
      .prepare('INSERT INTO daily_metrics (day, test, metric, count) VALUES (?, ?, ?, ?)')
      .run('2026-07-20', 'site', 'site_loaded', 7);
    database
      .prepare('INSERT INTO daily_metrics (day, test, metric, count) VALUES (?, ?, ?, ?)')
      .run('2026-07-20', 'udito', 'test_completed', 3);

    applyMigration(database, '0002_add_acutezza_metrics.sql');

    assert.deepEqual(plainRows(database.prepare('SELECT * FROM daily_metrics ORDER BY test').all()), [
      { count: 7, day: '2026-07-20', metric: 'site_loaded', test: 'site' },
      { count: 3, day: '2026-07-20', metric: 'test_completed', test: 'udito' },
    ]);
    assert.deepEqual(
      plainRows(database.prepare('PRAGMA index_list(daily_metrics)').all()).map(({ unique, origin }) => ({
        unique,
        origin,
      })),
      [{ unique: 1, origin: 'pk' }],
    );
    assert.match(
      database.prepare("SELECT sql FROM sqlite_schema WHERE name = 'daily_metrics'").get().sql,
      /WITHOUT ROWID$/i,
    );

    const insert = database.prepare(
      'INSERT INTO daily_metrics (day, test, metric, count) VALUES (?, ?, ?, ?)',
    );
    for (const values of [
      ['2026-07-20', 'unknown', 'test_started', 1],
      ['2026-07-20', 'site', 'test_started', 1],
      ['2026-07-20', 'udito', 'site_loaded', 1],
      ['2026-07-20', 'acutezza', 'test_started', -1],
      ['short', 'acutezza', 'test_started', 1],
    ]) {
      assert.throws(() => insert.run(...values), /constraint/i);
    }

    for (const metric of ['test_started', 'test_completed', 'report_downloaded']) {
      insert.run('2026-07-21', 'acutezza', metric, 1);
    }
    applyMigration(database, '0003_add_test_viewed_metric.sql');
    database
      .prepare('INSERT INTO daily_metrics (day, test, metric, count) VALUES (?, ?, ?, ?)')
      .run('2026-07-21', 'acutezza', 'test_viewed', 1);
    assert.equal(
      database.prepare("SELECT count(*) AS total FROM daily_metrics WHERE test = 'acutezza'").get().total,
      4,
    );
  } finally {
    database.close();
  }
});

test('the complete SQLite migration set executes every runtime-allowed metric pair', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    for (const filename of migrationFiles()) applyMigration(database, filename);
    const allowedPairs = [];
    for (const metric of Object.values(METRIC_EVENTS)) {
      for (const metricTest of Object.values(METRIC_TESTS)) {
        if (isAllowedMetric(metric, metricTest)) allowedPairs.push([metric, metricTest]);
      }
    }

    const binding = sqliteD1Binding(database);
    for (const [event, metricTest] of allowedPairs) {
      const result = await onRequest({
        request: metricRequest({ event, test: metricTest }),
        env: { ANALYTICS_DB: binding },
      });
      assert.equal(result.status, 204, `${metricTest}/${event} should satisfy the migrated schema`);
    }

    const rows = plainRows(
      database.prepare('SELECT test, metric, count FROM daily_metrics ORDER BY test, metric').all(),
    );
    assert.equal(rows.length, allowedPairs.length);
    assert.deepEqual(
      rows.map(({ test: metricTest, metric }) => [metric, metricTest]).sort(),
      allowedPairs.sort(),
    );
    assert.ok(rows.every(({ count }) => count === 1));
  } finally {
    database.close();
  }
});

function migrationFiles() {
  return readdirSync(MIGRATIONS)
    .filter((filename) => /^\d+.*\.sql$/.test(filename))
    .sort();
}

function applyMigration(database, filename) {
  database.exec(readFileSync(new URL(filename, MIGRATIONS), 'utf8'));
}

function metricRequest(payload) {
  return new Request(`${ORIGIN}/api/metric`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'sec-fetch-site': 'same-origin',
    },
    body: JSON.stringify(payload),
  });
}

function sqliteD1Binding(database) {
  return {
    prepare(sql) {
      const statement = database.prepare(sql);
      return {
        bind(...values) {
          return {
            async run() {
              statement.run(...values);
              return { success: true };
            },
          };
        },
      };
    },
  };
}

function plainRows(rows) {
  return rows.map((row) => ({ ...row }));
}
