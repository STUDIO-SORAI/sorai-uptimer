import type { APIRoute } from 'astro';
import { sendDiscordAlert } from '../../lib/discord';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let webhookUrl: string | undefined = undefined;
  try {
    const body = await request.json().catch(() => ({}));
    webhookUrl = body.webhookUrl;
  } catch (e) {
    // empty body
  }

  const success = await sendDiscordAlert({
    siteName: 'Vercel Status Guard (Test)',
    url: 'https://bax.vision',
    currentStatus: 'operational',
    statusCode: 200,
    responseTime: 42,
    webhookUrl,
  });

  return new Response(
    JSON.stringify({
      success,
      message: success
        ? 'Test Discord alert sent successfully!'
        : 'Failed to send Discord alert. Please check DISCORD_WEBHOOK_URL.',
    }),
    {
      status: success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
