import { env } from 'cloudflare:workers';
import type { ServiceStatus } from './types';

const BRAND = 'Server Status';
const BRAND_URL = 'https://stat.sorai.tw';
const BRAND_ICON = 'https://stat.sorai.tw/logo.png';
const SORAI_HOSTS = new Set(['cms.sorai.tw', 'esports.sorai.tw']);

function isWebhook(url: string): boolean {
  return url.startsWith('https://discord.com/api/webhooks/');
}

function hooksFor(siteUrl: string): string[] {
  const primary = ((env as Env).DISCORD_WEBHOOK_URL || '').trim();
  const sorai = ((env as Env).DISCORD_WEBHOOK_URL_SORAI || '').trim();
  const hooks: string[] = [];
  if (isWebhook(primary)) hooks.push(primary);

  let host = '';
  try {
    host = new URL(siteUrl).hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  if (SORAI_HOSTS.has(host) && isWebhook(sorai)) hooks.push(sorai);
  return hooks;
}

export async function sendDiscordAlert(options: {
  siteName: string;
  url: string;
  previousStatus?: ServiceStatus;
  currentStatus: ServiceStatus;
  statusCode: number;
  responseTime: number;
  error?: string;
}): Promise<boolean> {
  const hooks = hooksFor(options.url);
  if (hooks.length === 0) return false;

  const isDown = options.currentStatus === 'down';
  const isRecovered = options.previousStatus === 'down' && options.currentStatus === 'operational';
  const color = isDown ? 0xef4444 : isRecovered ? 0x10b981 : 0x0070f3;
  const title = isDown
    ? `🚨 Outage Detected: ${options.siteName}`
    : isRecovered
      ? `✅ Service Recovered: ${options.siteName}`
      : `ℹ️ Status Update: ${options.siteName}`;
  const description = isDown
    ? `**${options.siteName}** (${options.url}) is unreachable or returning error responses.`
    : isRecovered
      ? `**${options.siteName}** (${options.url}) is back online and responding normally.`
      : `**${options.siteName}** status changed.`;
  const statusText = isDown
    ? `🔴 DOWN (${options.statusCode || 'Timeout'})`
    : `🟢 UP (${options.statusCode})`;

  const embed = {
    author: { name: BRAND, icon_url: BRAND_ICON, url: BRAND_URL },
    title,
    description,
    url: options.url,
    color,
    thumbnail: { url: BRAND_ICON },
    fields: [
      { name: 'Service', value: `[${options.siteName}](${options.url})`, inline: true },
      { name: 'Status', value: statusText, inline: true },
      { name: 'Latency', value: `${options.responseTime} ms`, inline: true },
      ...(options.error
        ? [{ name: 'Error Details', value: '```' + options.error.substring(0, 200) + '```', inline: false }]
        : []),
    ],
    footer: { text: `${BRAND} · stat.sorai.tw`, icon_url: BRAND_ICON },
    timestamp: new Date().toISOString(),
  };

  const payload = JSON.stringify({
    username: BRAND,
    avatar_url: BRAND_ICON,
    embeds: [embed],
  });

  const results = await Promise.all(
    hooks.map(async (hook) => {
      try {
        const res = await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        return res.ok || res.status === 204;
      } catch (err) {
        console.error('[Discord] webhook failed', err);
        return false;
      }
    })
  );
  return results.some(Boolean);
}
