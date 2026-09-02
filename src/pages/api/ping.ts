import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { runAllChecks } from '../../lib/cron';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const result = await runAllChecks(getDb());
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
};
