# ⚡ Vercel-Style Uptime Monitor (Astro)

**Live Status**: [https://stats.sorai.tw](https://stats.sorai.tw)

A high-performance, serverless Uptime Monitor and Status Dashboard built with **Astro**, styled after **Vercel's official status page** (sleek dark aesthetic, 90-day interactive bar timeline, live latency tracking, Discord Webhook outage alerts, and 1-minute ping interval).

---

## 🚀 Features

- **🖤 Vercel Geist Aesthetic**: Deep black background (`#000000`), crisp typography, glowing status badges, and 90-segment daily status bars with interactive tooltips.
- **🎯 Monitored Sites**:
  - `https://bax.vision`
  - `https://esports.sorai.tw`
  - `https://sorai.tw`
- **⏱️ 1-Minute Ping Schedule**:
  - Native Vercel Cron integration via `vercel.json` hitting `/api/ping`.
  - Included GitHub Actions workflow (`.github/workflows/uptime-ping.yml`) as an external pinger fallback.
- **🔔 Discord Webhook Alerts**:
  - Rich embed notifications sent automatically whenever a site goes **DOWN** or **RECOVERS**.
  - Built-in test alert modal to verify your webhook in 1 click.
- **💾 Serverless Persistence**:
  - Out-of-the-box support for **Upstash Redis / Vercel KV** via REST API.
  - Zero-config graceful fallback to live probe & in-memory caching.

---

## 🛠️ Quick Start

### 1. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:4321` in your browser.

---

## 📦 Deployment on Vercel

### Step 1: Push to GitHub & Import to Vercel

1. Push this repository to GitHub.
2. In Vercel, click **Add New Project** and select your repository.
3. Astro and `@astrojs/vercel` will be automatically detected with `Output: Server (SSR)`.

### Step 2: Environment Variables (Optional)

Configure the following under **Project Settings > Environment Variables**:

| Variable | Description |
|---|---|
| `DISCORD_WEBHOOK_URL` | Discord channel webhook URL for outage and recovery alerts |
| `CRON_SECRET` | *(Optional)* Secret Bearer token to protect `/api/ping` |
| `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` | *(Optional)* Upstash / Vercel KV REST endpoint URL |
| `KV_REST_API_TOKEN` / `UPSTASH_REDIS_REST_TOKEN` | *(Optional)* Upstash / Vercel KV REST token |

---

## 📡 API Endpoints

- `GET /api/ping` - Pings all monitored sites, saves results, and triggers Discord alerts if status changes.
- `GET /api/status` - Returns live JSON status and 90-day history for all services.
- `POST /api/test-webhook` - Sends a test embed notification to your Discord webhook.

---

## 🔔 Discord Webhook Setup

1. In your Discord server: **Channel Settings ➔ Integrations ➔ Webhooks ➔ New Webhook**.
2. Copy the Webhook URL.
3. Add it as `DISCORD_WEBHOOK_URL` in Vercel or test it using the **Discord Webhook** button on the top right of the dashboard!
