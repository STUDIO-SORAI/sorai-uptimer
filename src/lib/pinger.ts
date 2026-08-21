import type { MonitoredSite } from '../config/sites';
import type { PingResult, ServiceStatus } from './types';

export async function pingSite(site: MonitoredSite): Promise<PingResult> {
  const timeoutMs = site.timeoutMs || 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = performance.now();

  try {
    const response = await fetch(site.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VercelUptimeRobot/1.0; +https://vercel.com)',
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
      },
      // Note: redirect 'follow' by default
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    const statusCode = response.status;

    let status: ServiceStatus = 'operational';
    let error: string | undefined = undefined;

    // Status evaluation
    if (statusCode >= 200 && statusCode < 400) {
      if (responseTime > 3000) {
        status = 'degraded';
      } else {
        status = 'operational';
      }
    } else {
      status = 'down';
      error = `HTTP status ${statusCode}`;
    }

    return {
      siteId: site.id,
      name: site.name,
      url: site.url,
      status,
      statusCode,
      responseTime,
      timestamp: Date.now(),
      error,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    const isTimeout = err.name === 'AbortError';
    const errorMsg = isTimeout ? `Request timed out after ${timeoutMs}ms` : (err.message || 'Connection failed');

    return {
      siteId: site.id,
      name: site.name,
      url: site.url,
      status: 'down',
      statusCode: 0,
      responseTime,
      timestamp: Date.now(),
      error: errorMsg,
    };
  }
}

export async function pingAllSites(sites: MonitoredSite[]): Promise<PingResult[]> {
  const results = await Promise.all(sites.map((site) => pingSite(site)));
  return results;
}
