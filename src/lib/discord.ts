import type { PingResult, ServiceStatus } from './types';

interface SendNotificationOptions {
  siteName: string;
  url: string;
  previousStatus?: ServiceStatus;
  currentStatus: ServiceStatus;
  statusCode: number;
  responseTime: number;
  error?: string;
  webhookUrl?: string;
}

export async function sendDiscordAlert(options: SendNotificationOptions): Promise<boolean> {
  const webhookUrl =
    options.webhookUrl ||
    process.env.DISCORD_WEBHOOK_URL ||
    import.meta.env?.DISCORD_WEBHOOK_URL;

  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.log('[Discord] No webhook URL configured or invalid URL. Skipping alert.');
    return false;
  }

  const isDown = options.currentStatus === 'down';
  const isRecovered = options.previousStatus === 'down' && options.currentStatus === 'operational';
  const isDegraded = options.currentStatus === 'degraded';

  // Embed Color: Red for Down, Green for Recovered/Operational, Amber for Degraded
  const color = isDown ? 0xef4444 : isRecovered ? 0x10b981 : isDegraded ? 0xf59e0b : 0x0070f3;

  const title = isDown
    ? `🚨 Outage Detected: ${options.siteName}`
    : isRecovered
    ? `✅ Service Recovered: ${options.siteName}`
    : isDegraded
    ? `⚠️ Degraded Performance: ${options.siteName}`
    : `ℹ️ Status Update: ${options.siteName}`;

  const description = isDown
    ? `**${options.siteName}** (${options.url}) is unreachable or returning error responses.`
    : isRecovered
    ? `**${options.siteName}** (${options.url}) is back online and responding normally.`
    : `**${options.siteName}** is experiencing high latency.`;

  const statusText = isDown
    ? `🔴 DOWN (${options.statusCode || 'Timeout'})`
    : isRecovered
    ? `🟢 UP (${options.statusCode})`
    : isDegraded
    ? `🟡 DEGRADED (${options.statusCode})`
    : `🔵 OPERATIONAL (${options.statusCode})`;

  const embed = {
    title,
    description,
    url: options.url,
    color,
    fields: [
      {
        name: 'Service',
        value: `[${options.siteName}](${options.url})`,
        inline: true,
      },
      {
        name: 'Status',
        value: statusText,
        inline: true,
      },
      {
        name: 'Latency',
        value: `${options.responseTime} ms`,
        inline: true,
      },
      ...(options.error
        ? [
            {
              name: 'Error Details',
              value: `\`\`\`${options.error.substring(0, 200)}\`\`\``,
              inline: false,
            },
          ]
        : []),
    ],
    footer: {
      text: 'Vercel Uptime Guard',
      icon_url: 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png',
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Vercel Status Guard',
        avatar_url: 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png',
        embeds: [embed],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Discord] Webhook returned status ${res.status}:`, text);
      return false;
    }

    console.log(`[Discord] Alert sent successfully for ${options.siteName}`);
    return true;
  } catch (err) {
    console.error('[Discord] Failed to send webhook alert:', err);
    return false;
  }
}
