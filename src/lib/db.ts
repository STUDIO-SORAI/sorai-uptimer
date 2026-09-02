import { env } from 'cloudflare:workers';
import type { CheckResult, Incident, Monitor } from './types';

export function getDb(): D1Database {
  const db = (env as Env).DB;
  if (!db) {
    throw new Error('缺少 D1 binding：請在 wrangler.toml 設定 [[d1_databases]] binding = "DB"');
  }
  return db;
}

export async function listMonitors(db: D1Database): Promise<Monitor[]> {
  const { results } = await db.prepare('SELECT * FROM monitors ORDER BY id ASC').all<Monitor>();
  return results ?? [];
}

export async function getMonitor(db: D1Database, id: number): Promise<Monitor | null> {
  return db.prepare('SELECT * FROM monitors WHERE id = ?').bind(id).first<Monitor>();
}

export async function listDueMonitors(db: D1Database): Promise<Monitor[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM monitors
       WHERE enabled = 1
         AND (
           last_checked_at IS NULL
           OR (strftime('%s','now') - strftime('%s', last_checked_at)) >= interval_min * 60
         )
       ORDER BY last_checked_at IS NULL DESC, last_checked_at ASC
       LIMIT 20`
    )
    .all<Monitor>();
  return results ?? [];
}

export async function uptimePct(db: D1Database, monitorId: number, days: number): Promise<number | null> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(ok), 0) AS ups
       FROM check_results
       WHERE monitor_id = ? AND checked_at >= datetime('now', ?)`
    )
    .bind(monitorId, `-${days} days`)
    .first<{ total: number; ups: number }>();
  if (!row || !row.total) return null;
  return (row.ups / row.total) * 100;
}

export async function recentChecks(db: D1Database, monitorId: number, limit = 60): Promise<CheckResult[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM check_results
       WHERE monitor_id = ?
       ORDER BY checked_at DESC
       LIMIT ?`
    )
    .bind(monitorId, limit)
    .all<CheckResult>();
  return (results ?? []).slice().reverse();
}

export async function listIncidents(db: D1Database, monitorId: number, limit = 50): Promise<Incident[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM incidents
       WHERE monitor_id = ?
       ORDER BY started_at DESC
       LIMIT ?`
    )
    .bind(monitorId, limit)
    .all<Incident>();
  return results ?? [];
}

export async function openIncident(db: D1Database, monitorId: number): Promise<Incident | null> {
  return db
    .prepare('SELECT * FROM incidents WHERE monitor_id = ? AND ended_at IS NULL ORDER BY id DESC LIMIT 1')
    .bind(monitorId)
    .first<Incident>();
}

export type MonitorStats = {
  monitor: Monitor;
  uptime24h: number | null;
  uptime30d: number | null;
};

export async function listMonitorStats(db: D1Database): Promise<MonitorStats[]> {
  const monitors = await listMonitors(db);
  return Promise.all(
    monitors.map(async (monitor) => ({
      monitor,
      uptime24h: await uptimePct(db, monitor.id, 1),
      uptime30d: await uptimePct(db, monitor.id, 30),
    }))
  );
}
