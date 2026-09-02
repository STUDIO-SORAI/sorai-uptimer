import type { MonitoredSite } from '../config/sites';

export type ServiceStatus = 'operational' | 'degraded' | 'down';

export type Monitor = {
  id: number;
  name: string;
  url: string;
  interval_min: number;
  expected_status: number;
  keyword: string | null;
  enabled: number;
  created_at: string;
  last_checked_at: string | null;
  last_status: 'up' | 'down' | 'unknown' | string;
  last_latency_ms: number | null;
  last_status_code: number | null;
  last_error: string | null;
};

export type CheckResult = {
  id: number;
  monitor_id: number;
  checked_at: string;
  ok: number;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
};

export type Incident = {
  id: number;
  monitor_id: number;
  started_at: string;
  ended_at: string | null;
  reason: string | null;
};

export type ProbeResult = {
  ok: boolean;
  status_code: number | null;
  latency_ms: number;
  error: string | null;
};

export interface PingResult {
  siteId: string;
  url: string;
  name: string;
  status: ServiceStatus;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  error?: string;
}

export interface DayRecord {
  date: string;
  status: ServiceStatus | 'nodata';
  uptimePercent: number;
  avgLatency: number;
  incidentsCount: number;
}

export interface SiteStatusData {
  site: MonitoredSite;
  current: PingResult;
  history: DayRecord[];
  uptime90d: number;
  avgLatency: number;
}
