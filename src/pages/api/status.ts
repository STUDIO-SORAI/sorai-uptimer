import type { APIRoute } from 'astro';
import { MONITORED_SITES } from '../../config/sites';
import { pingAllSites } from '../../lib/pinger';
import { getAllSitesStatusData, savePingResult } from '../../lib/storage';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const isFresh = url.searchParams.get('fresh') === 'true';

  let liveResults = undefined;
  if (isFresh) {
    liveResults = await pingAllSites(MONITORED_SITES);
    for (const r of liveResults) {
      await savePingResult(r);
    }
  }

  const siteStatuses = await getAllSitesStatusData(liveResults);

  const downCount = siteStatuses.filter((s) => s.current.status === 'down').length;
  const degradedCount = siteStatuses.filter((s) => s.current.status === 'degraded').length;

  let overallStatus: 'operational' | 'degraded' | 'down' = 'operational';
  if (downCount > 0) {
    overallStatus = 'down';
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
  }

  const payload = {
    status: overallStatus,
    operationalCount: siteStatuses.filter((s) => s.current.status === 'operational').length,
    totalCount: siteStatuses.length,
    updatedAt: new Date().toISOString(),
    sites: siteStatuses,
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
};
