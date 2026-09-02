# sorai-uptime

Open-source public status page and website uptime monitor. It runs on the **Cloudflare Workers free tier** (Astro SSR + D1 + Cron). There is no admin login on the live site.

Live:

- [stat.sorai.tw](https://stat.sorai.tw)
- [s.sorai.tw](https://s.sorai.tw)

## Features

- Public Vercel-style dark status page
- Monitor URLs live in one config file
- Minute Cron probes on Workers
- 90-day uptime bars and incident history
- Discord alerts via Worker secrets (never committed)
- Two consecutive failures before a site is marked Down

## Stack

- [Astro 7](https://astro.build) with `output: 'server'`
- [`@astrojs/cloudflare`](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- Cloudflare Workers, D1, Cron Trigger `* * * * *`
- Tailwind CSS v4

No Vercel, Durable Objects, Queues, or always-on Node process.

## Configure URLs

**`src/config/sites.ts` is the only place to set monitored URLs.** Edit `MONITORED_SITES` and redeploy. D1 rows are upserted from this list on every check; extra database monitors are disabled, not deleted.

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable slug used in the UI |
| `name` | yes | Display name |
| `url` | yes | Canonical site URL (shown on the status page) |
| `probeUrl` | no | First URL the Worker actually fetches |
| `fallbackUrl` | no | Tried if `probeUrl` fails |
| `group` | no | Section heading on the status page |
| `expectedStatus` | no | Defaults to `200` |
| `timeoutMs` | no | Hint only; Worker probe timeout is 15s |
| `webhooks` | no | `['primary']` (default) or `['primary', 'sorai']` |

Branding for Discord embeds lives in `src/config/brand.ts`.

### Probe URLs and Cloudflare

A Worker `fetch()` to an orange-clouded hostname **in the same Cloudflare account** goes to origin and skips the edge. Browsers and third-party monitors still hit the CDN. If origin does not have `robots.txt` (or the homepage 404s), a naive probe looks down while the public site is up.

Point `probeUrl` at a path that exists on origin. Keep `fallbackUrl` as a second path. A monitor is marked **Down**, an incident is opened, and Discord fires only after **two consecutive failed checks**.

## Setup

Needs Node 22+ and a Cloudflare account.

```bash
git clone https://github.com/STUDIO-SORAI/sorai-uptime.git
cd sorai-uptime
npm install
cp .dev.vars.example .dev.vars
```

Create D1 and put the id into `wrangler.toml`:

```bash
npx wrangler d1 create pulse
npx wrangler d1 execute pulse --remote --file=./schema.sql
```

Optional: edit `[[routes]]` in `wrangler.toml` for your own custom domains, or delete those blocks and use the `*.workers.dev` URL.

Set secrets (values stay in Cloudflare, not in git):

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
npx wrangler secret put DISCORD_WEBHOOK_URL_SORAI   # optional second channel
npx wrangler secret put CRON_SECRET                 # optional, default pulse-cron
```

Deploy:

```bash
npm run deploy
```

That runs `astro build && wrangler deploy`.

Local:

```bash
npx wrangler d1 execute pulse --local --file=./schema.sql
npx wrangler dev
```

## Secrets

| Name | Required | Purpose |
| --- | --- | --- |
| `DISCORD_WEBHOOK_URL` | no | Primary Discord webhook. Receives every monitor. |
| `DISCORD_WEBHOOK_URL_SORAI` | no | Extra webhook. Only sites whose config `webhooks` includes `'sorai'`. |
| `CRON_SECRET` | no | Protects `POST /api/cron`. Defaults to `pulse-cron`. |

Never commit `.dev.vars`. Copy `.dev.vars.example` for local values only.

## Discord

Alerts send as username **Server Status**, with the icon from `src/config/brand.ts`.

- Primary webhook: all monitors
- Extra `sorai` webhook: only monitors with `webhooks: ['primary', 'sorai']` (this instance: `esports.sorai.tw` and `cms.sorai.tw`)

## Free tier

- Workers free: about 100,000 requests per day
- Each Cron tick is one Worker request; each probe is another fetch
- Keep the monitor list small (tens of sites, not hundreds)
- Check history is retained for about 90 days
- D1 has a free allowance; no Durable Objects or Queues

## Project layout

```
src/config/sites.ts      monitor URLs (edit this)
src/config/brand.ts      Discord / status brand
src/lib/check.ts         HTTP probe + fallback
src/lib/cron.ts          due checks, consecutive-fail Down
src/lib/discord.ts       webhook fan-out
src/pages/index.astro    public status page
src/pages/api/cron.ts    Cron entry
src/worker.ts            fetch + scheduled handler
schema.sql               D1 schema + seed from config URLs
wrangler.toml            Worker name, D1, Cron, custom domains
```

## License

MIT. See [LICENSE](LICENSE).
