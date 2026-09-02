import type { ProbeResult } from './types';

const TIMEOUT_MS = 15_000;
const BODY_LIMIT = 256_000;

export async function probeUrl(
  url: string,
  expectedStatus: number,
  keyword?: string | null
): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; PulseUptime/1.0; +https://stat.sorai.tw)',
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      },
    });

    const latency_ms = Date.now() - started;
    let keywordOk = true;
    if (keyword) {
      const text = await readLimitedText(res);
      keywordOk = text.includes(keyword);
    }

    const statusOk = res.status >= 200 && res.status < 400;
    if (statusOk && keywordOk) {
      return { ok: true, status_code: res.status, latency_ms, error: null };
    }

    const error = !statusOk ? `HTTP ${res.status}（預期 ${expectedStatus}）` : `回應未包含關鍵字「${keyword}」`;
    return { ok: false, status_code: res.status, latency_ms, error };
  } catch (err) {
    const latency_ms = Date.now() - started;
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status_code: null, latency_ms, error: message };
  }
}

async function readLimitedText(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (out.length < BODY_LIMIT) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  try {
    await reader.cancel();
  } catch {
    /* ignore */
  }
  return out.slice(0, BODY_LIMIT);
}

export async function probeFirstOk(
  urls: string[],
  expectedStatus: number,
  keyword?: string | null
): Promise<ProbeResult> {
  const unique = [...new Set(urls.filter(Boolean))];
  let last: ProbeResult = { ok: false, status_code: null, latency_ms: 0, error: '沒有探測網址' };
  for (const url of unique) {
    last = await probeUrl(url, expectedStatus, keyword);
    if (last.ok) return last;
  }
  return last;
}
