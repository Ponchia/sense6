CREATE TABLE IF NOT EXISTS daily_metrics (
  day TEXT NOT NULL CHECK (length(day) = 10),
  test TEXT NOT NULL CHECK (test IN ('site', 'tetracromia', 'daltonia', 'riflessi', 'udito')),
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
