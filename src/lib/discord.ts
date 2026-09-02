import { env } from 'cloudflare:workers';
import { STATUS_BRAND } from '../config/brand';
import { MONITORED_SITES } from '../config/sites';
import type { ServiceStatus } from './types';

function isWebhook(url: string): boolean {
  return url.startsWith('https://discord.com/api/webhooks/');
}

function hostnameOf(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function usesSoraiWebhook(siteUrl: string): boolean {
  const host = hostnameOf(siteUrl);
  const canonical = siteUrl.replace(/\/$/, '');
  const site = MONITORED_SITES.find((s) => {
    if (s.url === siteUrl || s.url.replace(/\/$/, '') === canonical) return true;
    return hostnameOf(s.url) === host && host.length > 0;
  });
  const webhooks = site?.webhooks ?? ['primary'];
  return webhooks.includes('sorai');
}

function hooksFor(siteUrl: string): string[] {
  const primary = ((env as Env).DISCORD_WEBHOOK_URL || '').trim();
  const sorai = ((env as Env).DISCORD_WEBHOOK_URL_SORAI || '').trim();
  const hooks: string[] = [];
  if (isWebhook(primary)) hooks.push(primary);
  if (usesSoraiWebhook(siteUrl) && isWebhook(sorai)) hooks.push(sorai);
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
    ? `Outage Detected: ${options.siteName}`
    : isRecovered
      ? `Service Recovered: ${options.siteName}`
      : `Status Update: ${options.siteName}`;
  const description = isDown
    ? `**${options.siteName}** (${options.url}) is unreachable or returning error responses.`
    : isRecovered
      ? `**${options.siteName}** (${options.url}) is back online and responding normally.`
      : `**${options.siteName}** status changed.`;
  const statusText = isDown
    ? `DOWN (${options.statusCode || 'Timeout'})`
    : `UP (${options.statusCode})`;

  let brandHost = 'stat.sorai.tw';
  try {
    brandHost = new URL(STATUS_BRAND.url).hostname;
  } catch {
    /* keep default */
  }

  const embed = {
    author: { name: STATUS_BRAND.name, icon_url: STATUS_BRAND.icon, url: STATUS_BRAND.url },
    title,
    description,
    url: options.url,
    color,
    thumbnail: { url: STATUS_BRAND.icon },
    fields: [
      { name: 'Service', value: `[${options.siteName}](${options.url})`, inline: true },
      { name: 'Status', value: statusText, inline: true },
      { name: 'Latency', value: `${options.responseTime} ms`, inline: true },
      ...(options.error
        ? [{ name: 'Error Details', value: '```' + options.error.substring(0, 200) + '```', inline: false }]
        : []),
    ],
    footer: { text: `${STATUS_BRAND.name} \u00b7 ${brandHost}`, icon_url: STATUS_BRAND.icon },
    timestamp: new Date().toISOString(),
  };

  const payload = JSON.stringify({
    username: STATUS_BRAND.name,
    avatar_url: STATUS_BRAND.icon,
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
