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
  return r?.screen_names ? toAccount(r) : null;
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
