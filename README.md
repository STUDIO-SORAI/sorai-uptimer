# Pulse

Cloudflare Workers 免費方案的網站監控。Astro + D1 + Cron。

Live: https://stat.sorai.tw · https://s.sorai.tw · https://dash.bax.vision

## 監控

- https://bax.vision
- https://sorai.tw
- https://esports.sorai.tw
- https://cms.sorai.tw

Discord 告警以 Server Status 傳出；SORAI 專用 webhook 只收 CMS 跟 ESPORTS。

## 部署

npm install
cp .dev.vars.example .dev.vars
npx wrangler d1 execute pulse --remote --file=./schema.sql
npx astro build && npx wrangler deploy

Secrets: ADMIN_PASSWORD, DISCORD_WEBHOOK_URL, DISCORD_WEBHOOK_URL_SORAI, CRON_SECRET

不要提交 .dev.vars。
