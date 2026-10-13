/**
 * Turns collected source data into findings, facts, the trail and the summary.
 * Pure and deterministic: no network, no clock (the observation date is passed in).
 */
import { chainById, explorerAddress, explorerBlock, explorerTx } from "./chains";
import type { RpcData, GoPlusToken, GoPlusAddress, DexPair, EtherscanData } from "./sources/onchain";
import type { XAboutData, XHistoryData, XProfileData } from "./sources/social";
import type { RdapData, WaybackData, CrtData, SiteData } from "./sources/web";
import type { BlocklistData, ChainabuseData } from "./sources/reports";
import { rootDomain } from "./sources/web";
import type {
  Candidate, Fact, Finding, HandleAccount, HandleHistory, Klass, Report, Segment, SourceId, SourceRun,
  ThreadLink, ThreadNode, TrailEvent,
} from "./types";

export type Collected = {
  observedAt: string;
  subject: Report["subject"];
  runs: SourceRun[];

  handle?: string;
  xHistory?: XHistoryData | null;
  xById?: HandleAccount | null;
  xProfile?: XProfileData | null;
  xAbout?: XAboutData | null;
  handleTokens?: Candidate[];

  domain?: string;
  rdap?: RdapData | null;
  wayback?: WaybackData | null;
  crt?: CrtData | null;
  site?: SiteData | null;
  domainLists?: BlocklistData;
  phishing?: { phishing: boolean };
  domainAbuse?: ChainabuseData | null;

  address?: string;
  addressKind?: "CONTRACT" | "WALLET";
  chainId?: number;
  rpc?: RpcData;
  goToken?: GoPlusToken | null;
  goAddress?: GoPlusAddress;
  /** Labels for the deployer when the subject is a contract. */
  goDeployer?: GoPlusAddress & { address: string };
  dex?: DexPair[];
  es?: EtherscanData;
  addressLists?: BlocklistData;
  addressAbuse?: ChainabuseData | null;
  sameName?: Candidate[];
};

/* ---------- formatting ---------- */

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const pct = (v: number) => `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}%`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function usd(v: number | null | undefined) {
  if (v == null) return "Unknown";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ZERO = /^0x0{40}$|^0x0{36}dead$/i;
const flag = (t: GoPlusToken | null | undefined, k: string) => t?.[k] === "1";

/* ---------- handle history ---------- */

export function handleHistory(c: Collected): HandleHistory | undefined {
  if (!c.handle) return undefined;
  const h = c.handle.toLowerCase();
  const run = c.runs.find((r) => r.id === "x-history");
  const accounts = (c.xHistory?.accounts ?? []).filter((a) => a.names.length);
  if (c.xById?.names.length && !accounts.some((a) => a.id === c.xById!.id)) accounts.push(c.xById);
  const reported = c.xAbout ? { count: c.xAbout.changes, lastChangeAt: day(c.xAbout.lastChangeAt) } : undefined;
  if (!accounts.length) {
    const status = run?.status === "not_run" ? "not_run" : "unavailable";
    return {
      handle: h, status, others: [], changes: 0, archiveUntil: null, reported,
      note: run?.status === "failed" ? `The name archive could not be reached (${run.note}).${reported ? "" : " Name changes were not counted."}`
        : reported ? "The public name archive has no record of earlier names for this handle."
        : "No archived name history for this handle. Name changes could not be counted.",
    };
  }
  const lastSeenOf = (a: HandleAccount) => a.names.find((n) => n.name.toLowerCase() === h)?.lastSeen ?? "";
  const main = (c.xProfile && accounts.find((a) => a.id === c.xProfile!.id))
    ?? [...accounts].sort((a, b) => lastSeenOf(b).localeCompare(lastSeenOf(a)))[0];
  const others = accounts.filter((a) => a !== main);
  const archiveUntil = main.names.map((n) => n.lastSeen ?? "").sort().at(-1) || null;
  const first = main.names[0]?.firstSeen ?? null;
  return {
    handle: h, status: "observed", account: main, others, changes: Math.max(0, main.names.length - 1), archiveUntil, reported,
    note: first || archiveUntil
      ? `Names observed in a public archive between ${first ?? "an unknown date"} and ${archiveUntil ?? "an unknown date"}. Changes outside that window are not counted.`
      : "Names held in a public archive, without capture dates.",
  };
}

/* ---------- findings ---------- */

export function buildFindings(c: Collected, hh?: HandleHistory): Finding[] {
  const out: Finding[] = [];
  const at = c.observedAt;
  const add = (f: Omit<Finding, "observedAt"> & { observedAt?: string }) => out.push({ observedAt: at, ...f });
  const MEMORY = "memory.lol name archive";

  /* Social */
  if (hh && c.handle) {
    const h = `@${c.xProfile?.username ?? hh.account?.names.find((n) => n.name.toLowerCase() === hh.handle)?.name ?? hh.handle}`;
    const memUrl = `https://api.memory.lol/v1/tw/${hh.handle}`;
    const rep = hh.reported;
    if (rep) {
      // X's own account metadata: the authoritative change count.
      const ago = rep.lastChangeAt ? daysBetween(rep.lastChangeAt, at) : null;
      const recent = ago != null && ago <= 90;
      add({ id: "x-reported", klass: "confirmed", topic: "SOCIAL", weight: rep.count === 0 ? 48 : recent ? 90 : 84,
        source: "X account details (via Sorsa)", sourceUrl: `https://x.com/${hh.handle}/about`, eventAt: rep.lastChangeAt,
        text: rep.count === 0
          ? `X reports that ${h} has never changed its username.`
          : `X reports that ${h} has changed its username ${rep.count === 1 ? "once" : `${rep.count} times`}${rep.lastChangeAt ? `, most recently on ${rep.lastChangeAt}${ago != null ? ` (${plural(ago, "day")} ago)` : ""}` : ""}.`,
        limits: "X reports the count and the latest date. The earlier names themselves come from the public archive below, where it has them.",
        summary: rep.count === 0 ? `${h} has never changed its username, according to X.`
          : `${h} has changed its username ${rep.count === 1 ? "once" : `${rep.count} times`}${recent ? `, most recently ${plural(ago!, "day")} ago` : rep.lastChangeAt ? `, last on ${rep.lastChangeAt}` : ""}.` });
    }
    if (c.xAbout?.country) {
      add({ id: "x-country", klass: "credible", topic: "SOCIAL", weight: 30, source: "X account details (via Sorsa)", sourceUrl: `https://x.com/${hh.handle}/about`, eventAt: null,
        text: `X lists the account as based in ${c.xAbout.country}.`,
        limits: "X's own estimate from account signals. VPNs and travel can affect it." });
    }
    if (hh.status === "observed" && hh.account) {
      const names = hh.account.names;
      const first = names[0]?.firstSeen ?? null;
      if (hh.changes > 0) {
        add({ id: "x-changes", klass: "credible", topic: "SOCIAL", weight: 82, source: MEMORY, sourceUrl: memUrl, eventAt: first,
          text: `The account behind ${h} has used at least ${plural(names.length, "name")}: ${names.map((n) => `@${n.name}`).join(", ")}. That is at least ${plural(hh.changes, "name change")} between ${first ?? "an unknown date"} and ${hh.archiveUntil ?? "an unknown date"}.`,
          limits: "The archive captures names when it sees them. Changes it never saw are not counted, so this is a minimum.",
          summary: rep ? undefined : `${h} has changed its name at least ${hh.changes === 1 ? "once" : `${hh.changes} times`} (${plural(names.length, "name")} observed since ${first?.slice(0, 4) ?? "an unknown year"}).` });
        const cur = names.find((n) => n.name.toLowerCase() === hh.handle);
        const idx = cur ? names.indexOf(cur) : -1;
        if (cur?.firstSeen && idx > 0 && hh.archiveUntil && daysBetween(cur.firstSeen, hh.archiveUntil) <= 180) {
          add({ id: "x-recent", klass: "credible", topic: "SOCIAL", weight: 72, source: MEMORY, sourceUrl: memUrl, eventAt: cur.firstSeen,
            text: `The name ${h} first appears on ${cur.firstSeen}. Before that the account used @${names[idx - 1].name}.`,
            summary: rep ? undefined : `The current name was adopted recently, on ${cur.firstSeen}.` });
        }
      } else {
        add({ id: "x-changes", klass: "credible", topic: "SOCIAL", weight: 45, source: MEMORY, sourceUrl: memUrl, eventAt: first,
          text: first || hh.archiveUntil
            ? `Only one name, ${h}, is recorded for this account between ${first ?? "an unknown date"} and ${hh.archiveUntil ?? "an unknown date"}.`
            : `The archive holds this account under one name, ${h}, without capture dates.`,
          limits: "The archive is partial. A change it did not capture would not show here.",
          summary: rep ? undefined : `No name changes were observed for ${h} in the archive.` });
      }
      if (hh.others.length) {
        add({ id: "x-shared", klass: "credible", topic: "SOCIAL", weight: 66, source: MEMORY, sourceUrl: memUrl, eventAt: null,
          text: `${plural(hh.others.length, "other account")} also used the name ${h} at some point (account ID ${hh.others.map((o) => o.id).join(", ")}). Older posts under this name may belong to a different account.`,
          summary: `The name ${h} has been held by more than one account.` });
      }
    } else if (hh.status !== "not_run") {
      add({ id: "x-changes", klass: "unknown", topic: "SOCIAL", weight: rep ? 20 : 50, source: MEMORY, sourceUrl: memUrl, eventAt: null, text: hh.note,
        summary: rep ? undefined : `No name history was found for ${h}, so name changes could not be counted.` });
    }
  }
  if (c.xProfile) {
    const p = c.xProfile;
    if (p.createdAt) add({ id: "x-created", klass: "confirmed", topic: "SOCIAL", weight: 40, source: "X profile", sourceUrl: `https://x.com/${p.username}`, eventAt: day(p.createdAt),
      text: `The X account @${p.username} was created on ${day(p.createdAt)}${p.followers != null ? ` and has ${p.followers.toLocaleString("en-US")} followers` : ""}.` });
  }

  /* On-chain */
  const t = c.goToken;
  const pool = c.dex?.[0];
  const chainName = c.chainId ? chainById(c.chainId)?.name : undefined;
  const isContract = c.addressKind === "CONTRACT";
  const GOPLUS = "GoPlus Security token analysis";
  const goUrl = c.address && c.chainId ? `https://gopluslabs.io/token-security/${c.chainId}/${c.address}` : undefined;

  if (c.address && c.rpc) {
    if (!c.rpc.hits.length) {
      add({ id: "rpc-none", klass: "unknown", topic: "ON-CHAIN", weight: 60, source: "Public RPC nodes", eventAt: null,
        text: `${shortAddr(c.address)} has no code, transactions or balance on Ethereum, Base, BNB Chain, Arbitrum or Polygon.`,
        limits: c.rpc.failed.length ? `Not reachable during this check: ${c.rpc.failed.join(", ")}.` : "Other chains were not checked.",
        summary: "This address shows no activity on the five chains checked." });
    } else if (!isContract) {
      const sent = c.rpc.hits.filter((h) => h.nonce > 0);
      add({ id: "rpc-wallet", klass: "confirmed", topic: "ON-CHAIN", weight: 38, source: "Public RPC nodes", sourceUrl: explorerAddress(c.rpc.hits[0].chainId, c.address), eventAt: null,
        text: `Wallet active on ${c.rpc.hits.map((h) => h.name).join(", ")}.${sent.length ? ` Transactions sent: ${sent.map((h) => `${h.nonce.toLocaleString("en-US")} on ${h.name}`).join(", ")}.` : " It has not sent a transaction."}` });
    }
  }
  if (c.es) {
    const e = c.es;
    const cid = c.chainId ?? 1;
    if (e.creation) {
      const when = day(e.creation.timestamp);
      add({ id: "es-deploy", klass: "confirmed", topic: "ON-CHAIN", weight: 76, source: "Etherscan", sourceUrl: explorerTx(cid, e.creation.txHash), eventAt: when,
        text: `Deployed by ${shortAddr(e.creation.creator)}${e.creation.block ? ` at block ${Number(e.creation.block).toLocaleString("en-US")}` : ""}${when ? ` on ${when}` : ""}${chainName ? ` (${chainName})` : ""}.`,
        summary: when ? `The contract was deployed on ${when}${chainName ? ` on ${chainName}` : ""}.` : undefined });
    }
    if (isContract && e.verified !== undefined) {
      add({ id: "es-verified", klass: "confirmed", topic: "ON-CHAIN", weight: e.verified ? 28 : 64, source: "Etherscan", sourceUrl: c.address ? `${explorerAddress(cid, c.address)}#code` : undefined, eventAt: null,
        text: e.verified ? `Source code is verified${e.contractName ? ` (${e.contractName})` : ""}.` : "Source code is not verified, so the contract logic cannot be read on the explorer.",
        summary: e.verified ? undefined : "Its source code is not verified." });
    }
    if (!isContract && e.firstTx) {
      add({ id: "es-activity", klass: "confirmed", topic: "ON-CHAIN", weight: 44, source: "Etherscan", sourceUrl: explorerTx(cid, e.firstTx.hash), eventAt: day(e.firstTx.timestamp),
        text: `First transaction on ${day(e.firstTx.timestamp)}${e.lastTx ? `, most recent on ${day(e.lastTx.timestamp)}` : ""}${chainName ? ` (${chainName})` : ""}.`,
        summary: `The wallet has been active since ${day(e.firstTx.timestamp)}.` });
    }
  }
  if (t) {
    const tax = (k: string) => Number(t[k] ?? 0) * 100;
    const owner = t.owner_address ?? "";
    const renounced = !owner || ZERO.test(owner);
    const g = (id: string, w: number, text: string, summary?: string) =>
      add({ id, klass: "credible", topic: "ON-CHAIN", weight: w, source: GOPLUS, sourceUrl: goUrl, eventAt: null, text, summary,
        limits: "Static and simulated analysis of the contract. A flag means the code allows it, not that it has happened." });
    if (flag(t, "is_honeypot")) g("gp-honeypot", 96, "A simulated sell of this token failed (honeypot result).", "A simulated sell of the token failed.");
    if (flag(t, "cannot_sell_all")) g("gp-sellall", 82, "Holders cannot sell their full balance in one transaction.");
    const sameCreator = Number(t.honeypot_with_same_creator ?? 0);
    if (sameCreator > 0) g("gp-creator-hp", 92, `The deployer has created ${plural(sameCreator, "other token")} flagged as honeypots.`, `Its deployer has created ${plural(sameCreator, "other token")} flagged as honeypots.`);
    if (tax("buy_tax") > 10 || tax("sell_tax") > 10) g("gp-tax", 72, `Buy tax ${pct(tax("buy_tax"))}, sell tax ${pct(tax("sell_tax"))}.`, `Trades carry a ${pct(Math.max(tax("buy_tax"), tax("sell_tax")))} tax.`);
    if (flag(t, "hidden_owner")) g("gp-hidden", 78, "The contract has a hidden owner with privileged access.");
    if (flag(t, "can_take_back_ownership")) g("gp-takeback", 76, "Ownership can be reclaimed after it is renounced.");
    if (flag(t, "selfdestruct")) g("gp-selfdestruct", 70, "The contract can self-destruct.");
    if (flag(t, "is_mintable")) g("gp-mint", renounced ? 34 : 62, renounced ? "The contract has a mint function; ownership is renounced." : "The owner can mint new tokens.", renounced ? undefined : "The owner can mint new tokens.");
    if (flag(t, "slippage_modifiable")) g("gp-taxmod", 60, "The owner can change the trading tax.");
    if (flag(t, "transfer_pausable")) g("gp-pause", 52, "Transfers can be paused.");
    if (flag(t, "is_blacklisted")) g("gp-blacklist", 48, "The contract can block specific addresses from trading.");
    if (flag(t, "is_proxy")) g("gp-proxy", 50, "The contract is upgradeable, so its logic can change after deployment.");
    if (owner) g("gp-owner", renounced ? 22 : 46, renounced ? "Ownership is renounced." : `Ownership is held by ${shortAddr(owner)}.`);

    const lp = (pool?.pairAddress ?? "").toLowerCase();
    const top = (t.holders ?? []).filter((h) => !h.is_locked && !ZERO.test(h.address) && h.address.toLowerCase() !== lp);
    if (top.length) {
      const share = top.reduce((s, h) => s + Number(h.percent) * 100, 0);
      g("gp-holders", share > 50 ? 66 : 30, `The ${plural(top.length, "largest holder")} outside pools and burn addresses hold ${pct(share)} of supply${t.holder_count ? `, across ${Number(t.holder_count).toLocaleString("en-US")} holders` : ""}.`,
        share > 50 ? `${pct(share)} of supply sits with ${plural(top.length, "wallet")}.` : undefined);
    }
    const lps = t.lp_holders ?? [];
    if (lps.length) {
      const sum = (xs: typeof lps) => xs.reduce((s, h) => s + Number(h.percent) * 100, 0);
      const locked = sum(lps.filter((h) => h.is_locked === 1 || ZERO.test(h.address)));
      const wallets = sum(lps.filter((h) => !h.is_locked && !ZERO.test(h.address) && !h.is_contract));
      g("gp-lp", wallets > 50 ? 74 : 26, `${pct(wallets)} of pool LP tokens sit in ordinary wallets that can withdraw liquidity; ${pct(locked)} are locked or burned, and the rest is held by contracts.`,
        wallets > 50 ? `${pct(wallets)} of pool liquidity can be withdrawn by ordinary wallets.` : undefined);
    }
    const cex = t.is_in_cex?.cex_list ?? [];
    if (cex.length) g("gp-cex", 20, `Listed on ${cex.slice(0, 4).join(", ")}${cex.length > 4 ? ` and ${cex.length - 4} more` : ""}.`);
  }
  if (c.goDeployer?.flags.length) {
    add({ id: "gp-deployer", klass: "credible", topic: "REPORTS", weight: 92, source: `GoPlus address labels${c.goDeployer.dataSource ? ` (${c.goDeployer.dataSource})` : ""}`, sourceUrl: c.chainId ? explorerAddress(c.chainId, c.goDeployer.address) : undefined, eventAt: null,
      text: `The deployer ${shortAddr(c.goDeployer.address)} is labelled for ${c.goDeployer.flags.join(", ")}.`, summary: `Its deployer is labelled for ${c.goDeployer.flags.join(", ")}.` });
  }
  if (isContract && c.dex) {
    if (pool) {
      const created = pool.createdAt ? new Date(pool.createdAt).toISOString().slice(0, 10) : null;
      const low = (pool.liquidityUsd ?? 0) < 10_000;
      add({ id: "dex-pool", klass: "credible", topic: "ON-CHAIN", weight: low ? 70 : 42, source: "DexScreener", sourceUrl: pool.url, eventAt: created,
        text: `Main pool on ${cap(pool.dex)} (${pool.chain}) holds ${usd(pool.liquidityUsd)} in liquidity${created ? `, opened on ${created}` : ""}. ${plural(c.dex.length, "pool")} found.`,
        summary: low ? `Its main pool holds only ${usd(pool.liquidityUsd)} in liquidity.` : undefined });
      if (created && c.es?.creation?.timestamp) {
        const gap = daysBetween(c.es.creation.timestamp.slice(0, 10), created);
        if (gap >= 0) add({ id: "x-deploy-pool", klass: "confirmed", topic: "ON-CHAIN", weight: 36, source: "Etherscan and DexScreener", sourceUrl: pool.url, eventAt: created,
          text: gap === 0 ? "The first pool opened on the day the contract was deployed." : `The first pool opened ${plural(gap, "day")} after deployment.` });
      }
    } else {
      add({ id: "dex-none", klass: "unknown", topic: "ON-CHAIN", weight: 48, source: "DexScreener", eventAt: null,
        text: "No DEX pool was found for this token on the supported chains." });
    }
  }
  if (c.goAddress?.flags.length) {
    add({ id: "gp-address", klass: "credible", topic: "REPORTS", weight: 94, source: `GoPlus address labels${c.goAddress.dataSource ? ` (${c.goAddress.dataSource})` : ""}`, sourceUrl: c.address && c.chainId ? explorerAddress(c.chainId, c.address) : undefined, eventAt: null,
      text: `This address is labelled for ${c.goAddress.flags.join(", ")}.`, summary: `The address is labelled for ${c.goAddress.flags.join(", ")}.` });
  }
  for (const [i, s] of (c.sameName ?? []).entries()) {
    add({ id: `mis-${i}`, klass: "misattributed", topic: "IDENTITY", weight: 32 - i, source: s.source, sourceUrl: explorerAddress(s.chainId, s.address), eventAt: null,
      text: `Another token named ${s.name} (${s.symbol}) exists at ${shortAddr(s.address)} on ${s.chain}${s.liquidityUsd != null ? ` with ${usd(s.liquidityUsd)} liquidity` : ""}. It is a different contract; results for it are excluded.` });
  }

  /* Website */
  if (c.domain) {
    const d = c.domain;
    if (c.rdap) {
      const reg = day(c.rdap.registered);
      const age = reg ? daysBetween(reg, at) : null;
      if (reg) add({ id: "rdap-reg", klass: "confirmed", topic: "WEBSITE", weight: age != null && age < 90 ? 74 : 38, source: "RDAP registry record", sourceUrl: c.rdap.url, eventAt: reg,
        text: `${d} was registered on ${reg}${age != null ? ` (${plural(age, "day")} ago)` : ""}${c.rdap.registrar ? ` through ${c.rdap.registrar.replace(/.$/, "")}` : ""}.`,
        summary: age != null && age < 90 ? `The domain ${d} is ${plural(age, "day")} old.` : undefined });
      const exp = day(c.rdap.expires);
      if (exp && daysBetween(at, exp) <= 60 && daysBetween(at, exp) >= 0) add({ id: "rdap-exp", klass: "confirmed", topic: "WEBSITE", weight: 50, source: "RDAP registry record", sourceUrl: c.rdap.url, eventAt: exp,
        text: `The registration expires on ${exp}.` });
      if (reg && pool?.createdAt) {
        const created = new Date(pool.createdAt).toISOString().slice(0, 10);
        const gap = daysBetween(reg, created);
        add({ id: "x-domain-pool", klass: "confirmed", topic: "IDENTITY", weight: Math.abs(gap) <= 30 ? 58 : 30, source: "RDAP and DexScreener", sourceUrl: c.rdap.url, eventAt: reg,
          text: gap >= 0 ? `${d} was registered ${plural(gap, "day")} before the token's first pool opened.` : `${d} was registered ${plural(-gap, "day")} after the token's first pool opened.`,
          summary: Math.abs(gap) <= 30 ? `The domain was registered ${plural(Math.abs(gap), "day")} ${gap >= 0 ? "before" : "after"} the token's first pool.` : undefined });
      }
    } else if (c.rdap === null) {
      add({ id: "rdap-none", klass: "unknown", topic: "WEBSITE", weight: 40, source: "RDAP registry record", eventAt: null,
        text: `No registry record was returned for ${d}. Some country-code domains do not publish one, and unregistered names return nothing.` });
    }
    if (c.wayback) {
      add({ id: "wb-first", klass: "credible", topic: "WEBSITE", weight: 26, source: "Wayback Machine", sourceUrl: `https://web.archive.org/web/*/${d}`, eventAt: c.wayback.first,
        text: `First archived on ${c.wayback.first}${c.wayback.months ? `, and archived in ${c.wayback.capped ? "at least " : ""}${plural(c.wayback.months, "month")} since` : ""}.` });
    } else if (c.wayback === null) {
      add({ id: "wb-none", klass: "unknown", topic: "WEBSITE", weight: 30, source: "Wayback Machine", eventAt: null, text: `${d} has never been archived by the Wayback Machine.` });
    }
    const reg = day(c.rdap?.registered);
    if (reg && c.wayback?.first && daysBetween(c.wayback.first, reg) > 60) {
      add({ id: "x-reregistered", klass: "credible", topic: "WEBSITE", weight: 56, source: "RDAP and Wayback Machine", sourceUrl: `https://web.archive.org/web/*/${d}`, eventAt: reg,
        text: `${d} was archived as early as ${c.wayback.first}, before its current registration date of ${reg}. The domain may have lapsed or changed owners in between.`,
        limits: "Registries reset the registration date on re-registration; some also do on transfer. Check the archived pages to see who ran it before.",
        summary: `The domain was in use before its current registration in ${reg.slice(0, 4)}, so it may have changed owners.` });
    }
    if (c.crt) add({ id: "crt-first", klass: "credible", topic: "WEBSITE", weight: 18, source: "crt.sh certificate log", sourceUrl: `https://crt.sh/?q=${d}`, eventAt: c.crt.firstIssued,
      text: `First TLS certificate logged on ${c.crt.firstIssued}; ${plural(c.crt.count, "certificate")} on record.` });
    if (c.site) {
      if (c.site.addresses.length) add({ id: "site-addr", klass: "unverified", topic: "WEBSITE", weight: 28, source: "The website", sourceUrl: c.site.url, eventAt: null,
        text: `The site lists ${c.site.addresses.map(shortAddr).join(", ")}.`, limits: "A statement by the site itself." });
    }
  }

  /* Reports */
  const listsRan = c.runs.filter((r) => ["blocklists", "goplus-phishing", "chainabuse"].includes(r.id) && (r.status === "done" || r.status === "empty"));
  let reportHit = false;
  for (const [lists, target] of [[c.domainLists, c.domain], [c.addressLists, c.address && shortAddr(c.address)]] as const) {
    if (!lists || !target) continue;
    if (lists.metamask) { reportHit = true; add({ id: `bl-mm-${target}`, klass: "credible", topic: "REPORTS", weight: 96, source: "MetaMask phishing blocklist", sourceUrl: "https://github.com/MetaMask/eth-phishing-detect", eventAt: null, text: `${target} is on MetaMask's phishing blocklist.`, summary: `${target} is on MetaMask's phishing blocklist.` }); }
    if (lists.scamsniffer) { reportHit = true; add({ id: `bl-ss-${target}`, klass: "credible", topic: "REPORTS", weight: 95, source: "ScamSniffer blacklist", sourceUrl: "https://github.com/scamsniffer/scam-database", eventAt: null, text: `${target} is on ScamSniffer's blacklist.`, summary: `${target} is on ScamSniffer's blacklist.` }); }
    if (lists.lookalikeOf) { reportHit = true; add({ id: `bl-look-${target}`, klass: "credible", topic: "REPORTS", weight: 86, source: "MetaMask protected-domain list", sourceUrl: "https://github.com/MetaMask/eth-phishing-detect", eventAt: null, text: `${target} is one character away from ${lists.lookalikeOf}, a domain on MetaMask's protected list.`, summary: `${target} closely imitates ${lists.lookalikeOf}.` }); }
  }
  if (c.phishing?.phishing) { reportHit = true; add({ id: "gp-phish", klass: "credible", topic: "REPORTS", weight: 95, source: "GoPlus phishing-site check", eventAt: null, text: `${c.domain} is flagged as a phishing site.`, summary: `${c.domain} is flagged as a phishing site.` }); }
  for (const abuse of [c.domainAbuse, c.addressAbuse]) {
    if (!abuse) continue;
    reportHit = true;
    add({ id: `ca-${abuse.url}`, klass: "complaint", topic: "REPORTS", weight: 84, source: "Chainabuse community reports", sourceUrl: abuse.url, eventAt: abuse.latest,
      text: `${plural(abuse.count, "community report")} on Chainabuse${abuse.latest ? `, the latest on ${abuse.latest}` : ""}${abuse.categories.length ? ` (${abuse.categories.join(", ")})` : ""}.`,
      limits: "Reports are submitted by users and are not verified by ScamTrail.",
      summary: `Users have filed ${plural(abuse.count, "report")} about it on Chainabuse.` });
  }
  if (!reportHit && !c.goAddress?.flags.length && !c.goDeployer?.flags.length && listsRan.length) {
    add({ id: "reports-none", klass: "unknown", topic: "REPORTS", weight: 44, source: listsRan.map((r) => r.label).join(", "), eventAt: null,
      text: "No blocklist or report source returned a match. That is not the same as safe.",
      summary: "No blocklist or report source returned a match, which is not the same as safe." });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/* ---------- identity thread: how the handle, site and contract point at each other ---------- */

export function buildThread(c: Collected, findings: Finding[]): { nodes: ThreadNode[]; links: ThreadLink[] } {
  const nodes: ThreadNode[] = [];
  const links: ThreadLink[] = [];
  const s = c.subject.kind;
  const h = c.handle?.toLowerCase();
  const d = c.domain ? rootDomain(c.domain) : undefined;
  const a = c.address?.toLowerCase();
  if (h) nodes.push({ id: "h", kind: "HANDLE", value: `@${h}`, subject: s === "HANDLE" });
  if (c.domain) nodes.push({ id: "d", kind: "DOMAIN", value: c.domain, subject: s === "DOMAIN" });
  if (a) nodes.push({ id: "a", kind: c.addressKind === "WALLET" ? "WALLET" : "CONTRACT", value: a, subject: s === "WALLET" || s === "CONTRACT" });

  const host = (u?: string | null) => { try { return u ? rootDomain(new URL(u.startsWith("http") ? u : `https://${u}`).hostname) : undefined; } catch { return undefined; } };
  const pool = c.dex?.[0];
  const listingTwitter = pool?.socials.find((x) => x.type === "twitter")?.url.match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]{1,15})/i)?.[1]?.toLowerCase()
    ?? c.handleTokens?.[0]?.twitter;
  const listingSite = host(pool?.websites[0] ?? c.handleTokens?.[0]?.website);

  const join = (from: string, to: string, ab: boolean, ba: boolean, third: boolean, what: [string, string, string]) => {
    if (!nodes.some((n) => n.id === from) || !nodes.some((n) => n.id === to)) return;
    const klass: Klass = ab && ba ? "confirmed" : third ? "credible" : ab || ba ? "unverified" : "unknown";
    const note = ab && ba ? what[0] : third ? what[2] : ab || ba ? what[1] : "No link found between these two.";
    links.push({ from, to, klass, note });
  };

  if (h && d) {
    const profileToSite = host(c.xProfile?.url) === d;
    const siteToHandle = !!c.site?.handles.includes(h);
    join("h", "d", profileToSite, siteToHandle, listingTwitter === h && listingSite === d,
      ["The account and the site link to each other.", profileToSite ? "The account links to the site; the site does not link back." : "The site links to the account; the account's link was not checked.", "A token listing names both."]);
    if (c.site?.handles.length && !siteToHandle) {
      findings.push({ id: "x-site-mismatch", klass: "unverified", topic: "IDENTITY", weight: 70, source: "The website", sourceUrl: c.site.url, observedAt: c.observedAt, eventAt: null,
        text: `${c.domain} links to ${c.site.handles.map((x) => `@${x}`).join(", ")}, not to @${h}.`, summary: `The site links to a different X account than @${h}.` });
    }
  }
  if (h && a) {
    const listed = listingTwitter === h;
    join("h", "a", false, false, listed, ["", "", "The token's listing names this X account."]);
    if (listingTwitter && listingTwitter !== h) {
      findings.push({ id: "x-token-mismatch", klass: "unverified", topic: "IDENTITY", weight: 64, source: "DexScreener listing", sourceUrl: pool?.url, observedAt: c.observedAt, eventAt: null,
        text: `The token's listing names @${listingTwitter}, not @${h}.` });
    }
  }
  if (d && a) {
    const siteLists = !!c.site?.addresses.includes(a);
    const listed = listingSite === d;
    join("d", "a", siteLists, listed, false, ["The site lists the contract, and the token's listing names the site.", siteLists ? "The site lists this contract." : "The token's listing names this site.", ""]);
    if (c.site?.addresses.length && !siteLists && c.addressKind !== "WALLET") {
      findings.push({ id: "x-site-addr-mismatch", klass: "unverified", topic: "IDENTITY", weight: 62, source: "The website", sourceUrl: c.site.url, observedAt: c.observedAt, eventAt: null,
        text: `${c.domain} lists ${c.site.addresses.map(shortAddr).join(", ")}, which does not include ${shortAddr(a)}.` });
    }
  }
  findings.sort((x, y) => y.weight - x.weight);
  return { nodes, links };
}

/* ---------- facts tables ---------- */

const UNKNOWN = (label: string, why = "Unknown"): Fact => ({ label, value: why, klass: "unknown" });

export function onchainFacts(c: Collected): Fact[] {
  if (!c.address) return [];
  const f: Fact[] = [];
  const cid = c.chainId ?? 1;
  const t = c.goToken;
  const e = c.es;
  const pool = c.dex?.[0];
  const esRun = c.runs.find((x) => x.id === "etherscan");
  const esWhy = esRun?.status === "failed" ? esRun.note ?? "Etherscan failed" : esRun?.status === "not_run" ? esRun.note?.replace(/ (.*)$/, "") ?? "Not checked" : "Unknown";
  f.push(c.rpc ? { label: "Chains", value: c.rpc.hits.length ? c.rpc.hits.map((h) => `${h.name}${h.isContract ? "" : h.nonce ? ` (${h.nonce} tx sent)` : " (balance only)"}`).join(", ") : "No activity found", klass: "confirmed" } : UNKNOWN("Chains", "Not checked"));
  if (c.addressKind === "CONTRACT") {
    f.push(t?.token_name ? { label: "Token", value: `${t.token_name} (${t.token_symbol})`, klass: "credible" } : UNKNOWN("Token"));
    const creator = e?.creation?.creator ?? t?.creator_address;
    f.push(creator ? { label: "Deployer", value: shortAddr(creator), href: explorerAddress(cid, creator), klass: e?.creation ? "confirmed" : "credible" } : UNKNOWN("Deployer"));
    f.push(e?.creation ? { label: "Deployed", value: `${day(e.creation.timestamp) ?? ""}${e.creation.block ? ` · block ${Number(e.creation.block).toLocaleString("en-US")}` : ""}`.replace(/^ · /, ""), href: e.creation.block ? explorerBlock(cid, e.creation.block) : explorerTx(cid, e.creation.txHash), klass: "confirmed" } : UNKNOWN("Deployed", e ? "Unknown" : esWhy));
    f.push(e?.verified !== undefined ? { label: "Source verified", value: e.verified ? "Yes" : "No", klass: "confirmed" } : t?.is_open_source ? { label: "Source verified", value: t.is_open_source === "1" ? "Yes" : "No", klass: "credible" } : UNKNOWN("Source verified"));
    const yn = (k: string, label: string) => f.push(t?.[k] != null && t[k] !== "" ? { label, value: t[k] === "1" ? "Yes" : "No", klass: "credible" } : UNKNOWN(label));
    f.push(t?.owner_address != null ? { label: "Owner", value: !t.owner_address || ZERO.test(t.owner_address) ? "Renounced" : shortAddr(t.owner_address), href: t.owner_address && !ZERO.test(t.owner_address) ? explorerAddress(cid, t.owner_address) : undefined, klass: "credible" } : UNKNOWN("Owner"));
    yn("is_proxy", "Upgradeable");
    yn("is_mintable", "Mint function");
    yn("is_honeypot", "Sell simulation failed");
    f.push(t?.buy_tax != null ? { label: "Buy / sell tax", value: `${pct(Number(t.buy_tax || 0) * 100)} / ${pct(Number(t.sell_tax || 0) * 100)}`, klass: "credible" } : UNKNOWN("Buy / sell tax"));
    f.push(t?.holder_count ? { label: "Holders", value: Number(t.holder_count).toLocaleString("en-US"), klass: "credible" } : UNKNOWN("Holders"));
    f.push(pool ? { label: "Main pool", value: `${usd(pool.liquidityUsd)} · ${cap(pool.dex)}`, href: pool.url, klass: "credible" } : UNKNOWN("Main pool", c.dex ? "None found" : "Unknown"));
    f.push(pool?.createdAt ? { label: "Pool opened", value: new Date(pool.createdAt).toISOString().slice(0, 10), href: pool.url, klass: "credible" } : UNKNOWN("Pool opened"));
  } else {
    f.push(e?.firstTx ? { label: "First transaction", value: day(e.firstTx.timestamp)!, href: explorerTx(cid, e.firstTx.hash), klass: "confirmed" } : UNKNOWN("First transaction", e ? "None" : esWhy));
    f.push(e?.lastTx ? { label: "Latest transaction", value: day(e.lastTx.timestamp)!, href: explorerTx(cid, e.lastTx.hash), klass: "confirmed" } : UNKNOWN("Latest transaction", e ? "None" : esWhy));
    f.push(c.goAddress ? { label: "Address labels", value: c.goAddress.flags.length ? c.goAddress.flags.join(", ") : "None returned", klass: c.goAddress.flags.length ? "credible" : "unknown" } : UNKNOWN("Address labels", "Not checked"));
  }
  return f;
}

export function domainFacts(c: Collected): Fact[] {
  if (!c.domain) return [];
  const r = c.rdap;
  const w = c.wayback;
  const s = c.site;
  return [
    r?.registered ? { label: "Registered", value: day(r.registered)!, href: r.url, klass: "confirmed" } : UNKNOWN("Registered"),
    r?.changed ? { label: "Record last changed", value: day(r.changed)!, href: r.url, klass: "confirmed" } : UNKNOWN("Record last changed"),
    r?.expires ? { label: "Expires", value: day(r.expires)!, href: r.url, klass: "confirmed" } : UNKNOWN("Expires"),
    r?.registrar ? { label: "Registrar", value: r.registrar, klass: "confirmed" } : UNKNOWN("Registrar"),
    w ? { label: "First archived", value: w.first ?? "Unknown", href: `https://web.archive.org/web/*/${c.domain}`, klass: "credible" } : UNKNOWN("First archived", w === null ? "Never" : "Unknown"),
    c.crt ? { label: "First certificate", value: c.crt.firstIssued ?? "Unknown", href: `https://crt.sh/?q=${c.domain}`, klass: "credible" } : UNKNOWN("First certificate"),
    c.crt?.subdomains.length ? { label: "Subdomains seen", value: c.crt.subdomains.slice(0, 5).join(", "), klass: "credible" } : UNKNOWN("Subdomains seen", c.crt ? "None" : "Unknown"),
    s ? { label: "Site answered", value: `${s.https ? "HTTPS" : "HTTP only"}${s.title ? ` · ${s.title}` : ""}`, href: s.url, klass: "confirmed" } : UNKNOWN("Site answered", "No response"),
    s ? { label: "X accounts on site", value: s.handles.length ? s.handles.map((x) => `@${x}`).join(", ") : "None", klass: "unverified" } : UNKNOWN("X accounts on site"),
  ];
}

/* ---------- trail ---------- */

export function buildTrail(c: Collected, hh?: HandleHistory): TrailEvent[] {
  const ev: TrailEvent[] = [];
  for (const n of hh?.account?.names ?? []) if (n.firstSeen) ev.push({ date: n.firstSeen, kind: "HANDLE", value: `@${n.name}`, klass: "credible" });
  if (hh?.reported?.lastChangeAt) ev.push({ date: hh.reported.lastChangeAt, kind: "HANDLE", value: `@${c.xProfile?.username ?? hh.handle}`, klass: "confirmed", href: `https://x.com/${hh.handle}/about` });
  if (c.domain && c.rdap?.registered) ev.push({ date: day(c.rdap.registered)!, kind: "DOMAIN", value: c.domain, klass: "confirmed", href: c.rdap.url });
  if (c.domain && c.wayback?.first) ev.push({ date: c.wayback.first, kind: "DOMAIN", value: `${c.domain} first archived`, klass: "credible" });
  const cid = c.chainId ?? 1;
  if (c.address && c.es?.creation?.timestamp) ev.push({ date: day(c.es.creation.timestamp)!, kind: "CONTRACT", value: shortAddr(c.address), klass: "confirmed", href: explorerTx(cid, c.es.creation.txHash) });
  const pool = c.dex?.[0];
  if (pool?.createdAt) ev.push({ date: new Date(pool.createdAt).toISOString().slice(0, 10), kind: "POOL", value: `${cap(pool.dex)} pool opened`, klass: "credible", href: pool.url });
  if (c.addressKind === "WALLET" && c.es?.firstTx) ev.push({ date: day(c.es.firstTx.timestamp)!, kind: "ACTIVITY", value: "First transaction", klass: "confirmed", href: explorerTx(cid, c.es.firstTx.hash) });
  if (c.addressKind === "WALLET" && c.es?.lastTx) ev.push({ date: day(c.es.lastTx.timestamp)!, kind: "ACTIVITY", value: "Latest transaction", klass: "confirmed", href: explorerTx(cid, c.es.lastTx.hash) });
  return ev.sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- coverage, limits, summary ---------- */

export const SEGMENT_OF: Record<SourceId, Segment> = {
  "x-history": "SOCIAL", "x-profile": "SOCIAL", "x-about": "SOCIAL",
  rpc: "ON-CHAIN", etherscan: "ON-CHAIN", "goplus-token": "ON-CHAIN", "goplus-address": "ON-CHAIN", dexscreener: "ON-CHAIN", "name-search": "ON-CHAIN",
  rdap: "WEBSITE", wayback: "WEBSITE", crtsh: "WEBSITE", website: "WEBSITE",
  blocklists: "REPORTS", "goplus-phishing": "REPORTS", chainabuse: "REPORTS",
};

export function coverage(runs: SourceRun[]): Report["coverage"] {
  return (["SOCIAL", "ON-CHAIN", "WEBSITE", "REPORTS"] as Segment[]).map((segment) => {
    const rs = runs.filter((r) => r.segment === segment);
    return { segment, ran: rs.filter((r) => r.status === "done" || r.status === "empty").length, total: rs.length };
  });
}

export function limits(c: Collected): string[] {
  const out = c.runs.filter((r) => r.status === "failed" || r.status === "not_run").map((r) => `${r.label}: ${r.note ?? (r.status === "failed" ? "failed" : "not run")}.`);
  if (c.handle) out.push("Name history comes from a public archive and is incomplete; counts are minimums.");
  if (c.address) out.push("Only Ethereum, Base, BNB Chain, Arbitrum and Polygon were checked.");
  if (c.addressKind === "WALLET") out.push("A transfer between two wallets does not prove they share an owner.");
  out.push("Findings describe what each source returned on the date shown. They are not a judgement on intent.");
  return out;
}

const BANNED = /\b(scam(mer)?s?|legit(imate)?|trustworthy|rug ?pull(ed)?|fraud(ulent)?|guarantee[sd]?)\b/i;

export function summarize(findings: Finding[], runs: SourceRun[]): string[] {
  const lines = findings.filter((f) => f.summary).slice(0, 5).map((f) => f.summary!);
  const ran = runs.filter((r) => r.status === "done" || r.status === "empty").length;
  const notRun = runs.filter((r) => r.status === "not_run").length;
  lines.push(`${ran} of ${runs.length} sources returned results${notRun ? `; ${notRun} did not run` : ""}.`);
  return lines.filter((l) => !BANNED.test(l) && !/\bsafe\b/i.test(l.replace("not the same as safe", "")));
}

export function buildReport(c: Collected, caseId: string, generatedAt: string): Report {
  const hh = handleHistory(c);
  const findings = buildFindings(c, hh);
  const thread = buildThread(c, findings);
  return {
    caseId, query: c.subject.value, subject: c.subject, generatedAt,
    chains: c.rpc?.hits ?? [],
    summary: summarize(findings, c.runs),
    coverage: coverage(c.runs),
    sources: c.runs,
    findings,
    handle: hh,
    onchain: onchainFacts(c),
    domain: domainFacts(c),
    trail: buildTrail(c, hh),
    thread,
    limits: limits(c),
  };
}
