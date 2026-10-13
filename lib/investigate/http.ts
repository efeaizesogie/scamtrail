import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const UA = "ScamTrail/0.1 (+https://scamtrail.example/methodology)";

export class SourceError extends Error {}

/** GET or POST JSON with a timeout and one retry on 429 or 5xx. */
export async function fetchJson<T = unknown>(url: string, init: RequestInit & { timeout?: number } = {}): Promise<T> {
  const { timeout = 9000, ...rest } = init;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      ...rest,
      headers: { "user-agent": UA, accept: "application/json", ...(rest.headers ?? {}) },
      signal: AbortSignal.timeout(timeout),
      cache: "no-store",
    }).catch((e: Error) => {
      throw new SourceError(e.name === "TimeoutError" ? "Timed out" : "Could not connect");
    });
    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 900));
      continue;
    }
    if (res.status === 404) return null as T;
    if (!res.ok) throw new SourceError(res.status === 429 ? "Rate limited" : `HTTP ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new SourceError("Returned an unreadable response");
    }
  }
}

/** True for loopback, private, link-local, CGNAT and other non-public ranges. */
export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19));
}

async function assertPublicHost(host: string) {
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new SourceError("Host is not public");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => {
    throw new SourceError("Domain does not resolve");
  });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new SourceError("Host is not public");
}

/**
 * Fetches a public web page for link extraction. Guards against SSRF: http(s) only,
 * every hop must resolve to public addresses, at most 3 redirects, 1 MB read.
 */
export async function fetchPublicPage(start: string): Promise<{ url: string; status: number; html: string }> {
  let url = new URL(start);
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new SourceError("Unsupported protocol");
    if (url.port && !["80", "443"].includes(url.port)) throw new SourceError("Unsupported port");
    await assertPublicHost(url.hostname);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": UA, accept: "text/html,*/*;q=0.5" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    }).catch((e: Error) => {
      throw new SourceError(e.name === "TimeoutError" ? "Timed out" : "Could not connect");
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const dec = new TextDecoder();
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        html += dec.decode(value, { stream: true });
        if (size > 1_000_000) { await reader.cancel(); break; }
      }
    }
    return { url: url.toString(), status: res.status, html };
  }
  throw new SourceError("Too many redirects");
}

/** Small TTL cache shared by the route and slow-changing lists. */
export function ttlCache<V>(ms: number, max = 200) {
  const m = new Map<string, { v: V; at: number }>();
  return {
    get(k: string): V | undefined {
      const e = m.get(k);
      if (!e) return undefined;
      if (Date.now() - e.at > ms) { m.delete(k); return undefined; }
      return e.v;
    },
    set(k: string, v: V) {
      if (m.size >= max) m.delete(m.keys().next().value!);
      m.set(k, { v, at: Date.now() });
    },
  };
}
