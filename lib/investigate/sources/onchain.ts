import { CHAINS, chainByDex } from "../chains";
import { fetchJson, SourceError } from "../http";
import type { ChainHit } from "../types";

/* ---------- Public RPC: where does the address exist, and is it a contract ---------- */

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const r = await fetchJson<{ result?: T; error?: { message?: string } }>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    timeout: 7000,
  });
  if (!r || r.result === undefined) throw new SourceError(r?.error?.message ?? "No result");
  return r.result;
}

/** EIP-7702 delegated wallets carry a 23-byte 0xef0100 designator; they are still wallets. */
export const isContractCode = (code: string) => code.length > 2 && !/^0xef0100[0-9a-f]{40}$/i.test(code);

export type RpcData = { hits: ChainHit[]; failed: string[] };

export async function rpcScan(address: string): Promise<RpcData> {
  const failed: string[] = [];
  const results = await Promise.all(CHAINS.map(async (c) => {
    try {
      const [code, nonce, balance] = await Promise.all([
        rpc<string>(c.rpc, "eth_getCode", [address, "latest"]),
        rpc<string>(c.rpc, "eth_getTransactionCount", [address, "latest"]),
        rpc<string>(c.rpc, "eth_getBalance", [address, "latest"]),
      ]);
      const hit: ChainHit = { chainId: c.id, name: c.name, isContract: isContractCode(code), nonce: parseInt(nonce, 16), balance: BigInt(balance).toString() };
      return hit;
    } catch {
      failed.push(c.name);
      return null;
    }
  }));
  if (failed.length === CHAINS.length) throw new SourceError("No chain RPC answered");
  const hits = results.filter((h): h is ChainHit => !!h && (h.isContract || h.nonce > 0 || h.balance !== "0"));
  return { hits, failed };
}

/* ---------- GoPlus: token contract analysis and address labels ---------- */

export type GoPlusToken = Record<string, unknown> & {
  token_name?: string; token_symbol?: string; holder_count?: string; total_supply?: string;
  owner_address?: string; creator_address?: string; creator_percent?: string;
  is_open_source?: string; is_proxy?: string; is_mintable?: string; is_honeypot?: string; cannot_sell_all?: string;
  can_take_back_ownership?: string; hidden_owner?: string; selfdestruct?: string; transfer_pausable?: string;
  is_blacklisted?: string; slippage_modifiable?: string; trading_cooldown?: string; external_call?: string;
  buy_tax?: string; sell_tax?: string; honeypot_with_same_creator?: string;
  holders?: { address: string; tag?: string; percent: string; is_locked?: number; is_contract?: number }[];
  lp_holders?: { address: string; tag?: string; percent: string; is_locked?: number; is_contract?: number }[];
  is_in_cex?: { listed?: string; cex_list?: string[] };
};

export async function goplusToken(chainId: number, address: string): Promise<GoPlusToken | null> {
  const r = await fetchJson<{ code?: number; message?: string; result?: Record<string, GoPlusToken> }>(
    `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address}`,
  );
  if (r?.code !== 1) throw new SourceError(r?.message ?? "No result");
  const v = r.result?.[address.toLowerCase()];
  return v && Object.keys(v).length ? v : null;
}

export type GoPlusAddress = { flags: string[]; dataSource: string };

const ADDRESS_FLAGS: Record<string, string> = {
  cybercrime: "cybercrime", money_laundering: "money laundering", financial_crime: "financial crime",
  darkweb_transactions: "darkweb transactions", phishing_activities: "phishing", fake_kyc: "fake KYC",
  blacklist_doubt: "blacklist suspicion", stealing_attack: "theft", blackmail_activities: "blackmail",
  sanctioned: "sanctions", malicious_mining_activities: "malicious mining", mixer: "mixer use",
  fake_token: "fake token", honeypot_related_address: "honeypot-related",
};

export async function goplusAddress(chainId: number, address: string): Promise<GoPlusAddress> {
  const r = await fetchJson<{ code?: number; message?: string; result?: Record<string, string> }>(
    `https://api.gopluslabs.io/api/v1/address_security/${address}?chain_id=${chainId}`,
  );
  if (r?.code !== 1 || !r.result) throw new SourceError(r?.message ?? "No result");
  const flags = Object.entries(ADDRESS_FLAGS).filter(([k]) => r.result![k] === "1").map(([, label]) => label);
  return { flags, dataSource: r.result.data_source || "" };
}

/* ---------- DexScreener: pools, liquidity, listed links ---------- */

export type DexPair = {
  chainId: number; chain: string; dex: string; url: string; pairAddress: string;
  baseName: string; baseSymbol: string; baseAddress: string;
  liquidityUsd: number | null; fdv: number | null; createdAt: number | null;
  websites: string[]; socials: { type: string; url: string }[];
};

type RawPair = {
  chainId: string; dexId: string; url: string; pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  liquidity?: { usd?: number }; fdv?: number; pairCreatedAt?: number;
  info?: { websites?: { url: string }[]; socials?: { type: string; url: string }[] };
};

function toPair(p: RawPair): DexPair | null {
  const c = chainByDex(p.chainId);
  if (!c) return null;
  return {
    chainId: c.id, chain: c.name, dex: p.dexId, url: p.url, pairAddress: p.pairAddress,
    baseName: p.baseToken.name, baseSymbol: p.baseToken.symbol, baseAddress: p.baseToken.address,
    liquidityUsd: p.liquidity?.usd ?? null, fdv: p.fdv ?? null, createdAt: p.pairCreatedAt ?? null,
    websites: (p.info?.websites ?? []).map((w) => w.url), socials: p.info?.socials ?? [],
  };
}

export async function dexToken(chainSlug: string, address: string): Promise<DexPair[]> {
  const r = await fetchJson<RawPair[]>(`https://api.dexscreener.com/tokens/v1/${chainSlug}/${address}`);
  return (r ?? []).map(toPair).filter((p): p is DexPair => !!p)
    .filter((p) => p.baseAddress.toLowerCase() === address.toLowerCase())
    .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
}

export async function dexSearch(q: string): Promise<DexPair[]> {
  const r = await fetchJson<{ pairs?: RawPair[] }>(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`);
  return (r?.pairs ?? []).map(toPair).filter((p): p is DexPair => !!p);
}

/* ---------- Etherscan V2: deployment, verification, first and last activity ---------- */

export type EtherscanData = {
  creation?: { creator: string; txHash: string; block: string | null; timestamp: string | null };
  verified?: boolean;
  contractName?: string;
  proxy?: boolean;
  implementation?: string;
  firstTx?: { hash: string; block: string; timestamp: string; from: string };
  lastTx?: { hash: string; block: string; timestamp: string };
};

/** The free Etherscan plan allows 3 calls a second per key, shared by every search on this server. */
const ES_GAP_MS = 380;
let esQueue: Promise<unknown> = Promise.resolve();
const esSlot = () => {
  const turn = esQueue.then(() => new Promise((r) => setTimeout(r, ES_GAP_MS)));
  esQueue = turn;
  return turn;
};

async function es<T>(chainId: number, key: string, params: Record<string, string>, retry = true): Promise<T | null> {
  await esSlot();
  const qs = new URLSearchParams({ chainid: String(chainId), apikey: key, ...params });
  const r = await fetchJson<{ status?: string; message?: string; result?: T | string }>(`https://api.etherscan.io/v2/api?${qs}`);
  if (r?.status === "1") return r.result as T;
  const msg = typeof r?.result === "string" ? r.result : r?.message ?? "";
  if (/rate limit/i.test(msg)) {
    if (retry) return es<T>(chainId, key, params, false);
    throw new SourceError("Rate limited by Etherscan");
  }
  if (/no (transactions|data|records)/i.test(msg) || /^No /i.test(r?.message ?? "")) return null;
  if (/not supported|upgrade|paid|free api access/i.test(msg)) throw new SourceError("Chain not covered by this API key's plan");
  throw new SourceError(msg || "Request failed");
}

type Tx = { hash: string; blockNumber: string; timeStamp: string; from: string };
const iso = (unix: string | number) => new Date(Number(unix) * 1000).toISOString();

export async function etherscan(chainId: number, address: string, key: string, isContract: boolean): Promise<EtherscanData> {
  const out: EtherscanData = {};
  const txs = (sort: "asc" | "desc") => es<Tx[]>(chainId, key, { module: "account", action: "txlist", address, startblock: "0", endblock: "99999999", page: "1", offset: "1", sort });
  if (isContract) {
    const [creation, source] = await Promise.all([
      es<{ contractCreator: string; txHash: string; blockNumber?: string; timestamp?: string }[]>(chainId, key, { module: "contract", action: "getcontractcreation", contractaddresses: address }),
      es<{ SourceCode: string; ContractName: string; Proxy: string; Implementation: string }[]>(chainId, key, { module: "contract", action: "getsourcecode", address }),
    ]);
    const c = creation?.[0];
    if (c) out.creation = { creator: c.contractCreator, txHash: c.txHash, block: c.blockNumber ?? null, timestamp: c.timestamp ? iso(c.timestamp) : null };
    const s = source?.[0];
    if (s) {
      out.verified = !!s.SourceCode;
      out.contractName = s.ContractName || undefined;
      out.proxy = s.Proxy === "1";
      out.implementation = s.Implementation || undefined;
    }
  }
  if (isContract) return out;
  const [first, last] = await Promise.all([txs("asc"), txs("desc")]);
  if (first?.[0]) out.firstTx = { hash: first[0].hash, block: first[0].blockNumber, timestamp: iso(first[0].timeStamp), from: first[0].from };
  if (last?.[0]) out.lastTx = { hash: last[0].hash, block: last[0].blockNumber, timestamp: iso(last[0].timeStamp) };
  return out;
}
