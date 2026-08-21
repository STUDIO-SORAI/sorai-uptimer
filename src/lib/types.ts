import type { MonitoredSite } from '../config/sites';

export type ServiceStatus = 'operational' | 'degraded' | 'down';

export interface PingResult {
  siteId: string;
  url: string;
  name: string;
  status: ServiceStatus;
  statusCode: number;
  responseTime: number; // in milliseconds
  timestamp: number; // Unix timestamp in ms
  error?: string;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD
  status: ServiceStatus;
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

export interface OverallSystemStatus {
  status: ServiceStatus;
  operationalCount: number;
  totalCount: number;
  updatedAt: string;
  sites: SiteStatusData[];
}
