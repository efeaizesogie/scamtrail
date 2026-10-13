import { fetchJson, SourceError, ttlCache } from "../http";
import { rootDomain } from "./web";

/* ---------- Public blocklists (MetaMask eth-phishing-detect, ScamSniffer) ---------- */

type Lists = {
  mmBlack: Set<string>; mmWhite: Set<string>; mmFuzzy: string[]; tolerance: number;
  ssDomains: Set<string>; ssAddresses: Set<string>; loaded: string[];
};

const listCache = ttlCache<Lists>(6 * 60 * 60 * 1000, 1);
let inflight: Promise<Lists> | null = null;

const MM = "https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json";
const SS_D = "https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/domains.json";
const SS_A = "https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json";

async function loadLists(): Promise<Lists> {
  const hit = listCache.get("lists");
  if (hit) return hit;
  inflight ??= (async () => {
    const [mm, ssd, ssa] = await Promise.allSettled([
      fetchJson<{ blacklist?: string[]; whitelist?: string[]; fuzzylist?: string[]; tolerance?: number }>(MM, { timeout: 20000 }),
      fetchJson<string[]>(SS_D, { timeout: 25000 }),
      fetchJson<string[]>(SS_A, { timeout: 20000 }),
    ]);
    const lists: Lists = { mmBlack: new Set(), mmWhite: new Set(), mmFuzzy: [], tolerance: 1, ssDomains: new Set(), ssAddresses: new Set(), loaded: [] };
    if (mm.status === "fulfilled" && mm.value) {
      lists.mmBlack = new Set(mm.value.blacklist ?? []);
      lists.mmWhite = new Set(mm.value.whitelist ?? []);
      lists.mmFuzzy = mm.value.fuzzylist ?? [];
      lists.tolerance = mm.value.tolerance ?? 1;
      lists.loaded.push("MetaMask");
    }
    if (ssd.status === "fulfilled" && ssd.value) { lists.ssDomains = new Set(ssd.value.map((d) => d.toLowerCase())); lists.loaded.push("ScamSniffer domains"); }
    if (ssa.status === "fulfilled" && ssa.value) { lists.ssAddresses = new Set(ssa.value.map((a) => a.toLowerCase())); lists.loaded.push("ScamSniffer addresses"); }
    if (!lists.loaded.length) throw new SourceError("No blocklist could be downloaded");
    listCache.set("lists", lists);
    return lists;
  })().finally(() => { inflight = null; });
  return inflight;
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export type BlocklistData = {
  checked: string[];
  metamask: boolean;
  scamsniffer: boolean;
  /** A protected domain this one is a near copy of. */
  lookalikeOf: string | null;
};

/** Checks a host, or an address, against the lists. Parent domains count as matches. */
export async function blocklists(target: { domain?: string; address?: string }): Promise<BlocklistData> {
  const l = await loadLists();
  const out: BlocklistData = { checked: l.loaded, metamask: false, scamsniffer: false, lookalikeOf: null };
  if (target.address) out.scamsniffer = l.ssAddresses.has(target.address.toLowerCase());
  if (target.domain) {
    const host = target.domain.toLowerCase();
    const parts = host.split(".");
    const chain = parts.map((_, i) => parts.slice(i).join(".")).filter((d) => d.includes("."));
    const root = rootDomain(host);
    out.metamask = !l.mmWhite.has(root) && chain.some((d) => l.mmBlack.has(d));
    out.scamsniffer ||= chain.some((d) => l.ssDomains.has(d));
    if (!l.mmWhite.has(root) && !l.mmFuzzy.includes(root)) {
      out.lookalikeOf = l.mmFuzzy.find((f) => {
        const d = levenshtein(root, f);
        return d > 0 && d <= l.tolerance;
      }) ?? null;
    }
  }
  return out;
}

/* ---------- GoPlus phishing-site check ---------- */

export async function goplusPhishing(domain: string): Promise<{ phishing: boolean }> {
  const r = await fetchJson<{ code?: number; message?: string; result?: { phishing_site?: number } }>(
    `https://api.gopluslabs.io/api/v1/phishing_site?url=${encodeURIComponent(domain)}`,
  );
  if (r?.code !== 1 || !r.result) throw new SourceError(r?.message ?? "No result");
  return { phishing: r.result.phishing_site === 1 };
}

/* ---------- Chainabuse community reports (needs CHAINABUSE_API_KEY) ---------- */

export type ChainabuseData = { count: number; latest: string | null; categories: string[]; url: string };

export async function chainabuse(target: { domain?: string; address?: string }, key: string): Promise<ChainabuseData | null> {
  const q = target.address ? `address=${target.address}` : `domain=${encodeURIComponent(target.domain ?? "")}`;
  type Rep = { createdAt?: string; scamCategory?: string; category?: string };
  const r = await fetchJson<Rep[] | { reports?: Rep[]; count?: number }>(`https://api.chainabuse.com/v0/reports?${q}&perPage=50`, {
    headers: { authorization: `Basic ${Buffer.from(`${key}:${key}`).toString("base64")}` },
  });
  const reports = Array.isArray(r) ? r : r?.reports ?? [];
  if (!reports.length) return null;
  const dates = reports.map((x) => x.createdAt ?? "").filter(Boolean).sort();
  const categories = [...new Set(reports.map((x) => (x.scamCategory ?? x.category ?? "").replace(/_/g, " ").toLowerCase()).filter(Boolean))];
  const url = target.address ? `https://www.chainabuse.com/address/${target.address}` : `https://www.chainabuse.com/domain/${target.domain}`;
  return { count: Array.isArray(r) ? reports.length : r?.count ?? reports.length, latest: dates.at(-1)?.slice(0, 10) ?? null, categories: categories.slice(0, 4), url };
}
