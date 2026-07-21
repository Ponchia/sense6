CREATE TABLE daily_metrics_next (
  day TEXT NOT NULL CHECK (length(day) = 10),
  test TEXT NOT NULL CHECK (
    test IN ('site', 'tetracromia', 'daltonia', 'riflessi', 'udito', 'acutezza')
  ),
  metric TEXT NOT NULL CHECK (
    metric IN ('site_loaded', 'test_started', 'test_completed', 'report_downloaded')
  ),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (day, test, metric),
  CHECK (
    (test = 'site' AND metric = 'site_loaded') OR
    (test != 'site' AND metric != 'site_loaded')
  )
) WITHOUT ROWID;

INSERT INTO daily_metrics_next (day, test, metric, count)
SELECT day, test, metric, count
FROM daily_metrics;

DROP TABLE daily_metrics;

ALTER TABLE daily_metrics_next RENAME TO daily_metrics;
