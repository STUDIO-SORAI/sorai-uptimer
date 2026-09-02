import { handle } from '@astrojs/cloudflare/handler';

type WorkerEnv = {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  CRON_SECRET?: string;
  ASSETS?: Fetcher;
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    return handle(request, env, ctx);
  },

  async scheduled(_controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext): Promise<void> {
    const secret = env.CRON_SECRET || 'pulse-cron';
    const request = new Request('https://pulse.internal/api/cron', {
      method: 'POST',
      headers: { 'x-pulse-cron': secret },
    });
    const run = Promise.resolve(handle(request, env, ctx)).then(async (res) => {
      const body = await res.text();
      console.log('pulse cron', res.status, body.slice(0, 300));
    });
    ctx.waitUntil(run);
    await run;
  },
};
