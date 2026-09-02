import { MONITORED_SITES, type MonitoredSite } from '../config/sites';
import type { DayRecord, Monitor, PingResult, ServiceStatus, SiteStatusData } from './types';
import { listMonitors } from './db';

function toServiceStatus(last: string): ServiceStatus {
  return last === 'up' ? 'operational' : last === 'down' ? 'down' : 'down';
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function dailyHistory(db: D1Database, monitorId: number): Promise<DayRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT date(checked_at) AS d,
              ROUND(SUM(ok) * 100.0 / COUNT(*), 2) AS uptimePercent,
              ROUND(AVG(latency_ms)) AS avgLatency,
              SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS incidentsCount
       FROM check_results
       WHERE monitor_id = ? AND checked_at >= datetime('now', '-90 days')
       GROUP BY date(checked_at)`
    )
    .bind(monitorId)
    .all<{ d: string; uptimePercent: number; avgLatency: number; incidentsCount: number }>();

  const byDay = new Map((results ?? []).map((r) => [r.d, r]));
  const days: DayRecord[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dateKey(d);
    const row = byDay.get(key);
    if (!row) {
      days.push({ date: key, status: 'nodata', uptimePercent: 0, avgLatency: 0, incidentsCount: 0 });
      continue;
    }
    const pct = Number(row.uptimePercent) || 0;
    const status: ServiceStatus =
      pct >= 99 ? 'operational' : pct >= 50 ? 'degraded' : 'down';
    days.push({
      date: key,
      status,
      uptimePercent: pct,
      avgLatency: Number(row.avgLatency) || 0,
      incidentsCount: Number(row.incidentsCount) || 0,
    });
  }
  return days;
}

export async function buildSiteStatuses(db: D1Database): Promise<SiteStatusData[]> {
  const monitors = await listMonitors(db);
  const byUrl = new Map(monitors.map((m) => [m.url.replace(/\/$/, ''), m]));

  const out: SiteStatusData[] = [];
  for (const site of MONITORED_SITES) {
    const monitor: Monitor | undefined =
      byUrl.get(site.url.replace(/\/$/, '')) ||
      byUrl.get((site.probeUrl || '').replace(/\/$/, '')) ||
      monitors.find((m) => m.name === site.name);

    const history = monitor ? await dailyHistory(db, monitor.id) : emptyHistory();
    const withData = history.filter((h) => h.status !== 'nodata');
    const uptime90d =
      withData.length === 0
        ? 100
        : Math.round((withData.reduce((s, h) => s + h.uptimePercent, 0) / withData.length) * 100) / 100;
    const avgLatency =
      withData.length === 0
        ? 0
        : Math.round(withData.reduce((s, h) => s + s.avgLatency, 0) / withData.length);

    const status = monitor ? toServiceStatus(monitor.last_status) : 'down';
    const current: PingResult = {
      siteId: site.id,
      url: site.url,
      name: site.name,
      status,
      statusCode: monitor?.last_status_code || 0,
      responseTime: monitor?.last_latency_ms || 0,
      timestamp: Date.now(),
      error: monitor?.last_error || undefined,
    };

    out.push({ site, current, history, uptime90d, avgLatency });
  }
  return out;
}

function emptyHistory(): DayRecord[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days: DayRecord[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push({ date: dateKey(d), status: 'nodata', uptimePercent: 0, avgLatency: 0, incidentsCount: 0 });
  }
  return days;
}

export function siteForMonitor(monitor: Monitor): MonitoredSite | undefined {
  return MONITORED_SITES.find(
    (s) => s.url.replace(/\/$/, '') === monitor.url.replace(/\/$/, '') || s.name === monitor.name
  );
}
