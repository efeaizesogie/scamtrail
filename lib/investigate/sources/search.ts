import { CHAINS } from "../chains";
import { fetchJson } from "../http";
import type { Candidate } from "../types";
import { dexSearch, type DexPair } from "./onchain";

type CgCoin = { id: string; name: string; symbol: string; market_cap_rank: number | null };
type CgDetail = { platforms?: Record<string, string>; links?: { homepage?: string[]; twitter_screen_name?: string } };

const cgHeaders = (key?: string): Record<string, string> => (key ? { "x-cg-demo-api-key": key } : {});

export async function coingeckoSearch(q: string, key?: string): Promise<CgCoin[]> {
  const r = await fetchJson<{ coins?: CgCoin[] }>(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, { headers: cgHeaders(key) });
  return r?.coins ?? [];
}

export async function coingeckoDetail(id: string, key?: string): Promise<CgDetail | null> {
  return fetchJson<CgDetail>(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
    { headers: cgHeaders(key) },
  );
}

const twitterOf = (p: DexPair) => {
  const s = p.socials.find((x) => x.type === "twitter")?.url;
  return s?.match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]{1,15})/i)?.[1]?.toLowerCase();
};

/** Groups DexScreener pairs into one candidate per token, keeping its deepest pool. */
export function pairsToCandidates(pairs: DexPair[]): Candidate[] {
  const by = new Map<string, Candidate>();
  for (const p of pairs) {
    const k = `${p.chainId}:${p.baseAddress.toLowerCase()}`;
    const cur = by.get(k);
    if (cur && (cur.liquidityUsd ?? 0) >= (p.liquidityUsd ?? 0)) continue;
    by.set(k, {
      name: p.baseName, symbol: p.baseSymbol, chain: p.chain, chainId: p.chainId, address: p.baseAddress,
      liquidityUsd: p.liquidityUsd, website: p.websites[0], twitter: twitterOf(p), source: "DexScreener",
    });
  }
  return [...by.values()];
}

/** Project-name search: DexScreener pools on supported chains plus CoinGecko's top matches. */
export async function nameSearch(q: string, cgKey?: string): Promise<Candidate[]> {
  const [pairs, coins] = await Promise.all([dexSearch(q), coingeckoSearch(q, cgKey).catch(() => [] as CgCoin[])]);
  const list = pairsToCandidates(pairs);
  const seen = new Set(list.map((c) => `${c.chainId}:${c.address.toLowerCase()}`));
  for (const coin of coins.slice(0, 3)) {
    const d = await coingeckoDetail(coin.id, cgKey).catch(() => null);
    for (const chain of CHAINS) {
      const addr = d?.platforms?.[chain.coingecko];
      if (!addr || seen.has(`${chain.id}:${addr.toLowerCase()}`)) continue;
      seen.add(`${chain.id}:${addr.toLowerCase()}`);
      list.push({
        name: coin.name, symbol: coin.symbol.toUpperCase(), chain: chain.name, chainId: chain.id, address: addr,
        liquidityUsd: null, website: d?.links?.homepage?.find(Boolean), twitter: d?.links?.twitter_screen_name?.toLowerCase() || undefined, source: "CoinGecko",
      });
    }
  }
  return list.sort((a, b) => (b.liquidityUsd ?? -1) - (a.liquidityUsd ?? -1)).slice(0, 12);
}

/** Tokens whose listed X account is this handle (DexScreener and CoinGecko), found by searching `query`. */
export async function tokensForHandle(handle: string, cgKey?: string, query = handle): Promise<Candidate[]> {
  const h = handle.toLowerCase();
  const all = await nameSearch(query, cgKey);
  return all.filter((c) => c.twitter === h);
}
