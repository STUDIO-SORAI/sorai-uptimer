import { MONITORED_SITES } from '../config/sites';
import type { Monitor, ProbeResult, ServiceStatus } from './types';
import { listDueMonitors, openIncident, syncMonitorsFromConfig } from './db';
import { probeFirstOk } from './check';
import { sendDiscordAlert } from './discord';
import { siteForMonitor } from './status';

export async function runDueChecks(db: D1Database): Promise<{ checked: number; results: Array<{ id: number; ok: boolean }> }> {
  await syncMonitorsFromConfig(db);
  const due = await listDueMonitors(db);
  const probes = await Promise.all(
    due.map(async (monitor) => {
      const site = siteForMonitor(monitor);
      const targets = [site?.probeUrl, site?.fallbackUrl, monitor.url].filter((u): u is string => Boolean(u));
      return {
        monitor,
        probe: await probeFirstOk(targets, monitor.expected_status, monitor.keyword),
      };
    })
  );

  for (const { monitor, probe } of probes) {
    await recordCheck(db, monitor, probe);
  }

  await db.prepare(`DELETE FROM check_results WHERE checked_at < datetime('now', '-90 days')`).run();
  return {
    checked: probes.length,
    results: probes.map(({ monitor, probe }) => ({ id: monitor.id, ok: probe.ok })),
  };
}

export async function runAllChecks(db: D1Database): Promise<{ checked: number; results: Array<{ id: number; ok: boolean }> }> {
  await syncMonitorsFromConfig(db);
  const { results } = await db.prepare('SELECT * FROM monitors WHERE enabled = 1 ORDER BY id ASC').all<Monitor>();
  const due = results ?? [];
  const probes = await Promise.all(
    due.map(async (monitor) => {
      const site = MONITORED_SITES.find((s) => s.url.replace(/\/$/, '') === monitor.url.replace(/\/$/, ''));
      const targets = [site?.probeUrl, site?.fallbackUrl, monitor.url].filter((u): u is string => Boolean(u));
      return { monitor, probe: await probeFirstOk(targets, monitor.expected_status, monitor.keyword) };
    })
  );
  for (const { monitor, probe } of probes) {
    await recordCheck(db, monitor, probe);
  }
  return {
    checked: probes.length,
    results: probes.map(({ monitor, probe }) => ({ id: monitor.id, ok: probe.ok })),
  };
}

export async function recordCheck(db: D1Database, monitor: Monitor, probe: ProbeResult): Promise<void> {
  const previousRow = await db
    .prepare(`SELECT ok FROM check_results WHERE monitor_id = ? ORDER BY id DESC LIMIT 1`)
    .bind(monitor.id)
    .first<{ ok: number }>();
  const confirmedDown = !probe.ok && previousRow?.ok === 0;
  const status = probe.ok ? 'up' : confirmedDown ? 'down' : 'up';
  const previous: ServiceStatus = monitor.last_status === 'down' ? 'down' : 'operational';
  const next: ServiceStatus = status === 'down' ? 'down' : 'operational';
  const stmts = [
    db
      .prepare(
        `INSERT INTO check_results (monitor_id, ok, status_code, latency_ms, error)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(monitor.id, probe.ok ? 1 : 0, probe.status_code, probe.latency_ms, probe.error),
    db
      .prepare(
        `UPDATE monitors
         SET last_checked_at = datetime('now'),
             last_status = ?,
             last_latency_ms = ?,
             last_status_code = ?,
             last_error = ?
         WHERE id = ?`
      )
      .bind(status, probe.latency_ms, probe.status_code, probe.ok ? null : probe.error, monitor.id),
  ];

  const open = await openIncident(db, monitor.id);
  let opened = false;
  let recovered = false;
  if (confirmedDown && !open) {
    opened = true;
    stmts.push(
      db.prepare(`INSERT INTO incidents (monitor_id, reason) VALUES (?, ?)`).bind(monitor.id, probe.error || 'Unreachable')
    );
  } else if (probe.ok && open) {
    recovered = true;
    stmts.push(db.prepare(`UPDATE incidents SET ended_at = datetime('now') WHERE id = ?`).bind(open.id));
  }

  await db.batch(stmts);

  if (opened || recovered) {
    await sendDiscordAlert({
      siteName: monitor.name,
      url: monitor.url,
      previousStatus: previous,
      currentStatus: next,
      statusCode: probe.status_code || 0,
      responseTime: probe.latency_ms,
      error: probe.error || undefined,
    });
  }
}
