import type { APIRoute } from 'astro';
import { MONITORED_SITES } from '../../config/sites';
import { pingSite } from '../../lib/pinger';
import { getLastStatus, savePingResult } from '../../lib/storage';
import { sendDiscordAlert } from '../../lib/discord';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  return handlePing(request);
};

export const POST: APIRoute = async ({ request }) => {
  return handlePing(request);
};

async function handlePing(request: Request) {
  const cronSecret = process.env.CRON_SECRET || import.meta.env?.CRON_SECRET;
  const authHeader = request.headers.get('Authorization');

  // If CRON_SECRET is configured, check Bearer token
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Check query param as fallback for easy webhooks: ?secret=...
    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const results = [];
  const notificationsSent = [];

  for (const site of MONITORED_SITES) {
    const previousResult = await getLastStatus(site.id);
    const currentResult = await pingSite(site);

    // Save current result to storage
    await savePingResult(currentResult);

    // Check for state changes (e.g. operational -> down, or down -> operational)
    const prevStatus = previousResult?.status;
    const isStatusChanged = prevStatus && prevStatus !== currentResult.status;

    // If status changed or if it went down, trigger Discord Alert
    if (isStatusChanged || (currentResult.status === 'down' && !prevStatus)) {
      const alertSuccess = await sendDiscordAlert({
        siteName: site.name,
        url: site.url,
        previousStatus: prevStatus,
        currentStatus: currentResult.status,
        statusCode: currentResult.statusCode,
        responseTime: currentResult.responseTime,
        error: currentResult.error,
      });

      notificationsSent.push({
        siteId: site.id,
        previousStatus: prevStatus,
        currentStatus: currentResult.status,
        alertSuccess,
      });
    }

    results.push(currentResult);
  }

  return new Response(
    JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      notificationsSent,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
