/// <reference types="astro/client" />

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  CRON_SECRET?: string;
  DISCORD_WEBHOOK_URL?: string;
  DISCORD_WEBHOOK_URL_SORAI?: string;
}

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ADMIN_PASSWORD?: string;
    CRON_SECRET?: string;
    DISCORD_WEBHOOK_URL?: string;
    DISCORD_WEBHOOK_URL_SORAI?: string;
  }
}
