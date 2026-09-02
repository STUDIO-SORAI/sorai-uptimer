import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '../../lib/db';
import { runAllChecks } from '../../lib/cron';

export const prerender = false;

function authorized(request: Request): boolean {
  const secret = (env as Env).CRON_SECRET || 'pulse-cron';
  const header = request.headers.get('x-pulse-cron') || '';
  const auth = request.headers.get('authorization') || '';
  const url = new URL(request.url);
  const q = url.searchParams.get('secret') || '';
  return header === secret || auth === `Bearer ${secret}` || q === secret;
}

async function handle({ request }: { request: Request }) {
  if (!authorized(request)) {
    return json({ error: '未授權' }, 401);
  }
  try {
    const result = await runAllChecks(getDb());
    return json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = handle;
export const POST: APIRoute = handle;
