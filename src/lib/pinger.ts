import type { MonitoredSite } from '../config/sites';
import type { PingResult, ServiceStatus } from './types';

export async function pingSite(site: MonitoredSite): Promise<PingResult> {
  const targetUrl = site.probeUrl || site.url;
  const timeoutMs = site.timeoutMs || 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = performance.now();

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      // Note: redirect 'follow' by default
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    const statusCode = response.status;

    let status: ServiceStatus = 'operational';
    let error: string | undefined = undefined;

    // Strict Status evaluation:
    // 200-399: Operational (normal response / redirect)
    // 400+: Down (including 403 blocked, 500 error, 502 Bad Gateway, 503, 504)
    const isExpected = site.expectedStatus
      ? Array.isArray(site.expectedStatus)
        ? site.expectedStatus.includes(statusCode)
        : site.expectedStatus === statusCode
      : statusCode >= 200 && statusCode < 400;

    if (isExpected) {
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
