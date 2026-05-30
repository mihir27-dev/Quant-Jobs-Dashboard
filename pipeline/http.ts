// pipeline/http.ts
// Hardened fetch for polite, resilient ingestion:
//   - timeout via AbortController
//   - retry with exponential backoff + jitter
//   - honors Retry-After on 429/503
//   - per-host minimum interval (politeness throttle)
//   - conditional GET (ETag / Last-Modified) to skip unchanged boards
//
// Rate limiting is THE failure mode for job ingestion. We pull from official ATS APIs, not
// LinkedIn — but the same discipline keeps us a good citizen and stops a
// transient blip from sinking a whole run.

export interface CachedResponse {
  etag?: string;
  lastModified?: string;
  body: string;
}

export interface ConditionalCache {
  get(url: string): Promise<CachedResponse | undefined>;
  set(url: string, v: CachedResponse): Promise<void>;
}

class MemoryCache implements ConditionalCache {
  private m = new Map<string, CachedResponse>();
  async get(url: string) {
    return this.m.get(url);
  }
  async set(url: string, v: CachedResponse) {
    this.m.set(url, v);
  }
}

export interface RobustFetchOptions {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  minHostIntervalMs?: number;
  cache?: ConditionalCache;
  headers?: Record<string, string>;
}

const DEFAULTS = { timeoutMs: 4000, retries: 1, baseDelayMs: 300, minHostIntervalMs: 1000 };

const sharedCache = new MemoryCache();
const lastHostHit = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms: number) => ms * (0.5 + Math.random()); // 50–150%

async function throttleHost(host: string, minInterval: number) {
  const wait = (lastHostHit.get(host) ?? 0) + minInterval - Date.now();
  if (wait > 0) await sleep(wait);
  lastHostHit.set(host, Date.now());
}

function retryAfterMs(res: Response): number | null {
  const h = res.headers.get("retry-after");
  if (!h) return null;
  const secs = Number(h);
  if (!Number.isNaN(secs)) return secs * 1000;
  const date = Date.parse(h);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

/** GET a URL as text with full resilience. May return a cached body on 304. */
export async function robustGet(url: string, opts: RobustFetchOptions = {}): Promise<string> {
  const o = { ...DEFAULTS, ...opts };
  const cache = opts.cache ?? sharedCache;
  const host = new URL(url).host;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= o.retries; attempt++) {
    await throttleHost(host, o.minHostIntervalMs);

    const cached = await cache.get(url);
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (cached?.etag) headers["If-None-Match"] = cached.etag;
    if (cached?.lastModified) headers["If-Modified-Since"] = cached.lastModified;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), o.timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: ac.signal });
      clearTimeout(timer);

      if (res.status === 304 && cached) return cached.body;

      if (res.status === 429 || res.status >= 500) {
        if (attempt < o.retries) {
          await sleep(retryAfterMs(res) ?? jitter(o.baseDelayMs * 2 ** attempt));
          continue;
        }
        throw new Error(`${res.status} after ${o.retries} retries — ${url}`);
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);

      const body = await res.text();
      await cache.set(url, {
        etag: res.headers.get("etag") ?? undefined,
        lastModified: res.headers.get("last-modified") ?? undefined,
        body,
      });
      return body;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < o.retries) await sleep(jitter(o.baseDelayMs * 2 ** attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`fetch failed — ${url}`);
}

export async function robustGetJSON<T>(url: string, opts?: RobustFetchOptions): Promise<T> {
  return JSON.parse(await robustGet(url, opts)) as T;
}
