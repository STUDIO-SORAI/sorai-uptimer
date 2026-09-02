-- Pulse D1 schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS monitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  interval_min INTEGER NOT NULL DEFAULT 5 CHECK (interval_min IN (1, 5, 10, 15)),
  expected_status INTEGER NOT NULL DEFAULT 200,
  keyword TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_checked_at TEXT,
  last_status TEXT NOT NULL DEFAULT 'unknown',
  last_latency_ms INTEGER,
  last_status_code INTEGER,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS check_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id INTEGER NOT NULL,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  ok INTEGER NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER,
  error TEXT,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  reason TEXT,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_check_results_monitor_time
  ON check_results(monitor_id, checked_at);
CREATE INDEX IF NOT EXISTS idx_incidents_monitor
  ON incidents(monitor_id, ended_at);
CREATE INDEX IF NOT EXISTS idx_monitors_due
  ON monitors(enabled, last_checked_at);
