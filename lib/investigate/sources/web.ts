import { fetchJson, fetchPublicPage, SourceError } from "../http";

/* ---------- RDAP: registry record for the domain ---------- */

export type RdapData = { registered: string | null; changed: string | null; expires: string | null; registrar: string | null; status: string[]; url: string };

type RdapEntity = { roles?: string[]; vcardArray?: [string, [string, unknown, string, string][]] };

export async function rdap(domain: string): Promise<RdapData | null> {
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  const r = await fetchJson<{ events?: { eventAction: string; eventDate: string }[]; status?: string[]; entities?: RdapEntity[] }>(url);
  if (!r) return null;
  const ev = (a: string) => r.events?.find((e) => e.eventAction === a)?.eventDate ?? null;
  const reg = r.entities?.find((e) => e.roles?.includes("registrar"));
  const fn = reg?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] ?? null;
  return { registered: ev("registration"), changed: ev("last changed"), expires: ev("expiration"), registrar: fn, status: r.status ?? [], url };
}

/** Registrable part of a host, e.g. app.example.co.uk → example.co.uk (simple public-suffix rule). */
export function rootDomain(host: string): string {
  const parts = host.toLowerCase().replace(/\.$/, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  const twoLevel = /^(co|com|net|org|gov|edu|ac)$/.test(parts[parts.length - 2]) && parts[parts.length - 1].length === 2;
  return parts.slice(twoLevel ? -3 : -2).join(".");
}

/* ---------- Wayback Machine: first archived snapshot and how often it was archived ---------- */

export type WaybackData = { first: string | null; last: string | null; months: number | null; capped: boolean };

const cdxDate = (ts: string) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;

export async function wayback(domain: string): Promise<WaybackData | null> {
  // The availability API answers fast with the snapshot closest to 1996, i.e. the first one.
  const avail = await fetchJson<{ archived_snapshots?: { closest?: { timestamp?: string } } }>(
    `https://archive.org/wayback/available?url=${encodeURIComponent(domain)}&timestamp=19960101`, { timeout: 12000 },
  );
  let ts = avail?.archived_snapshots?.closest?.timestamp;
  if (!ts) {
    // The availability API sometimes answers empty under load. Only CDX can confirm "never archived".
    const first = await fetchJson<string[][]>(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&limit=1`, { timeout: 15000 },
    ).catch(() => { throw new SourceError("Archive index did not respond"); });
    ts = first?.[1]?.[0];
    if (!ts) return null;
  }
  const LIMIT = 400;
  const months = await fetchJson<string[][]>(
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&collapse=timestamp:6&limit=${LIMIT}`, { timeout: 9000 },
  ).catch(() => null);
  const m = (months ?? []).slice(1);
  return { first: cdxDate(ts), last: m.length ? cdxDate(m[m.length - 1][0]) : null, months: months ? m.length : null, capped: m.length >= LIMIT };
}

/* ---------- crt.sh: certificate transparency ---------- */

export type CrtData = { firstIssued: string | null; count: number; subdomains: string[] };

export async function crtsh(domain: string): Promise<CrtData | null> {
  // crt.sh answers 404 or 502 when overloaded, which must not read as "no certificates".
  const res = await fetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, { signal: AbortSignal.timeout(12000), cache: "no-store" })
    .catch(() => { throw new SourceError("Certificate log did not respond"); });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) throw new SourceError("Certificate log is not responding");
  const rows = (await res.json().catch(() => null)) as { not_before?: string; name_value?: string }[] | null;
  if (!Array.isArray(rows)) throw new SourceError("Certificate log returned an unreadable response");
  if (!rows.length) return null;
  const dates = rows.map((x) => x.not_before ?? "").filter(Boolean).sort();
  const subs = new Set<string>();
  for (const x of rows) for (const n of (x.name_value ?? "").split("\n")) if (!n.startsWith("*") && n !== domain) subs.add(n.toLowerCase());
  return { firstIssued: dates[0]?.slice(0, 10) ?? null, count: rows.length, subdomains: [...subs].slice(0, 12) };
}

/* ---------- The website itself: links to X accounts and contract addresses ---------- */

export type SiteData = { url: string; status: number; title: string | null; handles: string[]; addresses: string[]; https: boolean };

const RESERVED = new Set(["share", "intent", "home", "i", "search", "hashtag", "explore", "settings", "login", "signup", "tos", "privacy"]);

export function extractLinks(html: string) {
  const handles = new Set<string>();
  for (const m of html.matchAll(/https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/gi)) {
    const h = m[1].toLowerCase();
    if (!RESERVED.has(h)) handles.add(h);
  }
  for (const m of html.matchAll(/<meta[^>]+(?:name|property)=["']twitter:(?:site|creator)["'][^>]*>/gi)) {
    const h = m[0].match(/content=["']@?([A-Za-z0-9_]{1,15})["']/i)?.[1]?.toLowerCase();
    if (h && !RESERVED.has(h)) handles.add(h);
  }
  const addresses = new Set<string>();
  for (const m of html.matchAll(/(?<![A-Za-z0-9])0x[a-fA-F0-9]{40}(?![A-Za-z0-9])/g)) addresses.add(m[0].toLowerCase());
  const title = html.match(/<title[^>]*>([^<]{1,140})<\/title>/i)?.[1]?.trim() ?? null;
  return { handles: [...handles].slice(0, 6), addresses: [...addresses].slice(0, 6), title };
}

export async function website(domain: string): Promise<SiteData> {
  let page: Awaited<ReturnType<typeof fetchPublicPage>>;
  let https = true;
  try {
    page = await fetchPublicPage(`https://${domain}/`);
  } catch (e) {
    if (e instanceof SourceError && /not public|does not resolve/i.test(e.message)) throw e;
    https = false;
    page = await fetchPublicPage(`http://${domain}/`);
  }
  if (page.status >= 400) throw new SourceError(`Site answered HTTP ${page.status}`);
  const { handles, addresses, title } = extractLinks(page.html);
  return { url: page.url, status: page.status, title, handles, addresses, https: https && page.url.startsWith("https:") };
}
