import { fetchJson, SourceError } from "../http";
import type { HandleAccount } from "../types";

/** memory.lol: archived screen names per X account ID, with first and last seen dates. */
export type XHistoryData = { accounts: HandleAccount[] };

type MemoryLol = { id_str?: string; id?: number; screen_names?: Record<string, [string, string] | [string] | null> };

function toAccount(a: MemoryLol): HandleAccount {
  const names = Object.entries(a.screen_names ?? {}).map(([name, dates]) => ({
    name,
    firstSeen: dates?.[0] ?? null,
    lastSeen: dates?.[1] ?? dates?.[0] ?? null,
  }));
  names.sort((x, y) => (x.firstSeen ?? "9999").localeCompare(y.firstSeen ?? "9999"));
  return { id: a.id_str ?? String(a.id ?? ""), names };
}

export async function xHistoryByName(handle: string): Promise<XHistoryData | null> {
  const r = await fetchJson<{ accounts?: MemoryLol[] }>(`https://api.memory.lol/v1/tw/${encodeURIComponent(handle)}`);
  const accounts = (r?.accounts ?? []).map(toAccount).filter((a) => a.names.length);
  return accounts.length ? { accounts } : null;
}

export async function xHistoryById(id: string): Promise<HandleAccount | null> {
  const r = await fetchJson<MemoryLol>(`https://api.memory.lol/v1/tw/id/${encodeURIComponent(id)}`);
  const acc = r?.screen_names ? toAccount(r) : null;
  return acc?.names.length ? acc : null;
}

/** X API v2 profile. Needs X_BEARER_TOKEN. */
export type XProfileData = {
  id: string;
  username: string;
  name: string;
  createdAt: string | null;
  description: string;
  url: string | null;
  followers: number | null;
  verified: boolean;
};

export async function xProfile(handle: string, token: string): Promise<XProfileData | null> {
  type R = {
    data?: {
      id: string; username: string; name: string; created_at?: string; description?: string; verified?: boolean;
      url?: string; public_metrics?: { followers_count?: number };
      entities?: { url?: { urls?: { expanded_url?: string }[] }; description?: { urls?: { expanded_url?: string }[] } };
    };
    errors?: { detail?: string }[];
  };
  const r = await fetchJson<R>(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=created_at,description,url,public_metrics,verified,entities`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!r?.data) {
    if (r?.errors?.length) return null;
    throw new SourceError("No profile returned");
  }
  const d = r.data;
  const expanded = d.entities?.url?.urls?.[0]?.expanded_url ?? d.entities?.description?.urls?.[0]?.expanded_url ?? d.url ?? null;
  return {
    id: d.id, username: d.username, name: d.name, createdAt: d.created_at ?? null,
    description: d.description ?? "", url: expanded, followers: d.public_metrics?.followers_count ?? null, verified: !!d.verified,
  };
}

/* ---------- Sorsa (X data API): profile and X's own "About this account" metadata ---------- */

const SORSA = "https://api.sorsa.io/v3";
const sorsaHeaders = (key: string) => ({ ApiKey: key });

/** Bio links arrive as t.co short links; read the redirect target without following it. */
async function expandShortLink(u: string): Promise<string> {
  if (!/^https?:\/\/t\.co\//i.test(u)) return u;
  try {
    const res = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(5000), cache: "no-store" });
    return res.headers.get("location") ?? u;
  } catch {
    return u;
  }
}

export async function sorsaProfile(handle: string, key: string): Promise<XProfileData | null> {
  type R = { id?: string; username?: string; display_name?: string; description?: string; created_at?: string;
    followers_count?: number; verified?: boolean; bio_urls?: string[] | null; message?: string; error?: string };
  const r = await fetchJson<R>(`${SORSA}/info?username=${encodeURIComponent(handle)}`, { headers: sorsaHeaders(key) });
  if (!r) return null;
  if (!r.id) {
    if (/not found|suspend|does not exist/i.test(`${r.message ?? ""} ${r.error ?? ""}`)) return null;
    throw new SourceError(r.message ?? r.error ?? "No profile returned");
  }
  const raw = r.bio_urls?.[0] ?? r.description?.match(/https?:\/\/\S+/)?.[0] ?? null;
  const created = r.created_at ? new Date(r.created_at) : null;
  return {
    id: r.id, username: r.username ?? handle, name: r.display_name ?? "",
    createdAt: created && !Number.isNaN(created.getTime()) ? created.toISOString() : null,
    description: r.description ?? "", url: raw ? await expandShortLink(raw) : null,
    followers: r.followers_count ?? null, verified: !!r.verified,
  };
}

/** X's account metadata: username change count and date, country, Premium start. */
export type XAboutData = {
  changes: number;
  lastChangeAt: string | null;
  country: string | null;
  premiumSince: string | null;
};

export async function sorsaAbout(handle: string, key: string): Promise<XAboutData | null> {
  type R = { username_change_count?: number; last_username_change_at?: string; country?: string; premium_start_at?: string; message?: string; error?: string };
  const r = await fetchJson<R>(`${SORSA}/about?username=${encodeURIComponent(handle)}`, { headers: sorsaHeaders(key) });
  if (!r) return null;
  if (typeof r.username_change_count !== "number") {
    if (/not found|suspend|does not exist/i.test(`${r.message ?? ""} ${r.error ?? ""}`)) return null;
    throw new SourceError(r.message ?? r.error ?? "No account metadata returned");
  }
  // The epoch date means "never changed".
  const real = (d?: string) => (d && !d.startsWith("1970") ? d : null);
  return { changes: r.username_change_count, lastChangeAt: real(r.last_username_change_at), country: r.country || null, premiumSince: real(r.premium_start_at) };
}

/* ---------- Scrape Creators: X profile ---------- */

/** Profile via Scrape Creators (1 credit per call). Same shape as the X API profile. */
export async function scrapeCreatorsProfile(handle: string, key: string): Promise<XProfileData | null> {
  type R = {
    success?: boolean; message?: string; error?: string; rest_id?: string;
    is_blue_verified?: boolean; verification?: { verified?: boolean };
    core?: { created_at?: string; name?: string; screen_name?: string };
    legacy?: { created_at?: string; name?: string; screen_name?: string; description?: string; followers_count?: number; url?: string;
      entities?: { url?: { urls?: { expanded_url?: string }[] }; description?: { urls?: { expanded_url?: string }[] } } };
  };
  const r = await fetchJson<R>(`https://api.scrapecreators.com/v1/twitter/profile?handle=${encodeURIComponent(handle)}`,
    { headers: { "x-api-key": key }, timeout: 15000 });
  if (!r) return null;
  if (!r.rest_id) {
    const msg = `${r.message ?? ""} ${r.error ?? ""}`;
    if (/not found|suspend|does not exist|no user/i.test(msg)) return null;
    if (/credit/i.test(msg)) throw new SourceError("Out of Scrape Creators credits");
    throw new SourceError(msg.trim() || "No profile returned");
  }
  const l = r.legacy ?? {};
  const created = new Date(r.core?.created_at ?? l.created_at ?? "");
  const link = l.entities?.url?.urls?.[0]?.expanded_url ?? l.entities?.description?.urls?.[0]?.expanded_url ?? (l.url ? await expandShortLink(l.url) : null);
  return {
    id: r.rest_id,
    username: r.core?.screen_name ?? l.screen_name ?? handle,
    name: r.core?.name ?? l.name ?? "",
    createdAt: Number.isNaN(created.getTime()) ? null : created.toISOString(),
    description: l.description ?? "",
    url: link ?? null,
    followers: l.followers_count ?? null,
    verified: !!(r.is_blue_verified || r.verification?.verified),
  };
}
