import { createHash } from "node:crypto";
import { CHAINS, chainById } from "./chains";
import { SourceError } from "./http";
import { buildReport, SEGMENT_OF, type Collected } from "./rules";
import { dexSearch, dexToken, etherscan, goplusAddress, goplusToken, rpcScan } from "./sources/onchain";
import { blocklists, chainabuse, goplusPhishing } from "./sources/reports";
import { nameSearch, pairsToCandidates, tokensForHandle } from "./sources/search";
import { scrapeCreatorsProfile, sorsaAbout, sorsaProfile, xHistoryById, xHistoryByName, xProfile } from "./sources/social";
import { crtsh, rdap, rootDomain, wayback, website } from "./sources/web";
import type { Report, SourceId, SourceRun, StreamEvent, SubjectKind } from "./types";

export type Env = { etherscan?: string; x?: string; scrapeCreators?: string; sorsa?: string; chainabuse?: string; coingecko?: string };

export type Input = { q: string; type?: string | null; chainId?: number | null };

const LABEL: Record<SourceId, string> = {
  "x-history": "X name archive", "x-profile": "X profile", "x-about": "X account details",
  rpc: "Chain nodes", etherscan: "Etherscan", "goplus-token": "GoPlus contract analysis", "goplus-address": "GoPlus address labels",
  dexscreener: "DexScreener pools", "name-search": "Name search",
  rdap: "Domain registry (RDAP)", wayback: "Wayback Machine", crtsh: "Certificate log", website: "Website",
  blocklists: "Public blocklists", "goplus-phishing": "GoPlus phishing check", chainabuse: "Chainabuse reports",
};

const ALL = Object.keys(LABEL) as SourceId[];

/** Hosts that are link hubs or social sites, not a project's own domain. */
const NOT_PROJECT_SITE = /(^|\.)(x\.com|twitter\.com|t\.co|t\.me|telegram\.me|linktr\.ee|discord\.gg|discord\.com|medium\.com|github\.com|youtube\.com|youtu\.be|instagram\.com|facebook\.com|tiktok\.com|linkedin\.com|bit\.ly|mirror\.xyz|substack\.com|gitbook\.io|notion\.site)$/i;

export function normalize(input: Input): { kind: SubjectKind | "ADDRESS"; value: string } {
  const raw = input.q.trim();
  const xUrl = raw.match(/^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})\/?(?:[?#].*)?$/i);
  if (xUrl) return { kind: "HANDLE", value: xUrl[1].toLowerCase() };
  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) return { kind: "ADDRESS", value: raw.toLowerCase() };
  if (raw.startsWith("@") || input.type === "HANDLE") return { kind: "HANDLE", value: raw.replace(/^@/, "").toLowerCase() };
  const host = raw.match(/^(?:https?:\/\/)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24})(?::\d+)?(?:[/?#].*)?$/i)?.[1];
  if (host) return { kind: "DOMAIN", value: host.toLowerCase().replace(/^www\./, "") };
  if (/^[A-Za-z0-9_]{1,15}$/.test(raw) && /_|\d/.test(raw)) return { kind: "HANDLE", value: raw.toLowerCase() };
  return { kind: "PROJECT", value: raw };
}

export const caseId = (value: string, date: string) =>
  `ST-${date.slice(0, 4)}-${createHash("sha256").update(`${value.toLowerCase()}|${date}`).digest("hex").slice(0, 6).toUpperCase()}`;

export async function investigate(input: Input, env: Env, emit: (e: StreamEvent) => void): Promise<Report | null> {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const n = normalize(input);

  /* Project names resolve to candidates first; the reader confirms which one they mean. */
  if (n.kind === "PROJECT") {
    const candidates = await nameSearch(n.value, env.coingecko).catch(() => []);
    if (candidates.length !== 1) {
      emit({ t: "candidates", query: n.value, candidates });
      return null;
    }
    return investigate({ q: candidates[0].address, chainId: candidates[0].chainId }, env, emit);
  }

  const runs = new Map<SourceId, SourceRun>(ALL.map((id) => [id, { id, label: LABEL[id], segment: SEGMENT_OF[id], status: "queued" }]));
  const update = (id: SourceId, patch: Partial<SourceRun>) => {
    const r = { ...runs.get(id)!, ...patch };
    runs.set(id, r);
    emit({ t: "source", run: r });
  };
  const notRun = (id: SourceId, note: string) => update(id, { status: "not_run", note });

  /** Runs one source with progress, timing and error capture. Returns undefined on failure. */
  async function step<T>(id: SourceId, fn: () => Promise<T>, describe?: (v: T) => string, url?: string): Promise<T | undefined> {
    const t0 = Date.now();
    update(id, { status: "running" });
    try {
      const v = await fn();
      const empty = v === null || (Array.isArray(v) && v.length === 0);
      update(id, { status: empty ? "empty" : "done", note: empty ? "No records returned" : describe?.(v), ms: Date.now() - t0, url });
      return v;
    } catch (e) {
      if (!(e instanceof SourceError)) console.error(`[investigate] ${id}`, e);
      update(id, { status: "failed", note: e instanceof SourceError ? e.message : "Unexpected error", ms: Date.now() - t0 });
      return undefined;
    }
  }

  const subjectKind: SubjectKind = n.kind === "ADDRESS" ? "CONTRACT" : n.kind;
  const c: Collected = { observedAt: today, subject: { kind: subjectKind, value: n.value }, runs: [] };
  emit({ t: "start", caseId: caseId(n.value, today), subject: c.subject, sources: [...runs.values()] });

  const done = new Set<"handle" | "domain" | "address">();

  async function handleBlock(handle: string) {
    done.add("handle");
    c.handle = handle;
    if (env.x) {
      c.xProfile = await step("x-profile", () => xProfile(handle, env.x!), (p) => p ? `@${p.username}` : "", `https://x.com/${handle}`);
    } else if (env.scrapeCreators) {
      c.xProfile = await step("x-profile", () => scrapeCreatorsProfile(handle, env.scrapeCreators!), (p) => p ? `@${p.username} via Scrape Creators` : "", `https://x.com/${handle}`);
    } else if (env.sorsa) {
      c.xProfile = await step("x-profile", () => sorsaProfile(handle, env.sorsa!), (p) => p ? `@${p.username} via Sorsa` : "", `https://x.com/${handle}`);
    } else notRun("x-profile", "Needs an X API, Scrape Creators or Sorsa key");
    if (env.sorsa) {
      c.xAbout = await step("x-about", () => sorsaAbout(handle, env.sorsa!),
        (a) => a ? `${a.changes} username change${a.changes === 1 ? "" : "s"} reported` : "", `https://x.com/${handle}/about`);
    } else notRun("x-about", "Needs a Sorsa API key (SORSA_API_KEY)");
    const [hist, tokens] = await Promise.all([
      step("x-history", async () => {
        const r = await xHistoryByName(handle);
        if (c.xProfile?.id) c.xById = await xHistoryById(c.xProfile.id).catch(() => null);
        return r ?? (c.xById ? { accounts: [c.xById] } : null);
      }, (h) => h ? `${h.accounts.length === 1 ? "1 account" : `${h.accounts.length} accounts`} found` : ""),
      c.subject.kind === "HANDLE" ? step("name-search", async () => {
        // Token listings name their X account; search by handle, then by the profile's display name.
        const byHandle = await tokensForHandle(handle, env.coingecko);
        const display = c.xProfile?.name?.trim();
        if (byHandle.length || !display || display.toLowerCase() === handle) return byHandle;
        return tokensForHandle(handle, env.coingecko, display);
      }, (t) => `${t.length} listed token${t.length === 1 ? "" : "s"}`) : Promise.resolve(undefined),
    ]);
    c.xHistory = hist;
    if (tokens) c.handleTokens = tokens;
  }

  async function domainBlock(domain: string) {
    done.add("domain");
    c.domain = domain;
    const root = rootDomain(domain);
    const [r, w, cr, s, bl, ph, ab] = await Promise.all([
      step("rdap", () => rdap(root), (v) => v?.registered ? `Registered ${v.registered.slice(0, 10)}` : "Record found"),
      step("wayback", () => wayback(domain), (v) => v?.first ? `First seen ${v.first}` : ""),
      step("crtsh", () => crtsh(root), (v) => v ? `${v.count} certificates` : ""),
      step("website", () => website(domain), (v) => v.https ? "Answered over HTTPS" : "Answered over HTTP"),
      step("blocklists", () => blocklists({ domain }), (v) => `Checked ${v.checked.join(", ")}`),
      step("goplus-phishing", () => goplusPhishing(domain), (v) => (v.phishing ? "Flagged" : "No flag")),
      env.chainabuse ? step("chainabuse", () => chainabuse({ domain }, env.chainabuse!), (v) => v ? `${v.count} reports` : "") : Promise.resolve(notRun("chainabuse", "Needs a Chainabuse API key (CHAINABUSE_API_KEY)")),
    ]);
    Object.assign(c, { rdap: r, wayback: w, crt: cr, site: s, domainLists: bl, phishing: ph, domainAbuse: ab ?? undefined });
  }

  async function addressBlock(address: string, hint?: number | null) {
    done.add("address");
    c.address = address;
    const scan = await step("rpc", () => rpcScan(address), (v) => v.hits.length ? `Found on ${v.hits.map((h) => h.name).join(", ")}` : "No activity on supported chains");
    c.rpc = scan;
    const hits = scan?.hits ?? [];
    const contracts = hits.filter((h) => h.isContract);
    const isContract = contracts.length > 0;
    c.addressKind = isContract || !scan ? "CONTRACT" : "WALLET";
    if (c.subject.kind === "CONTRACT" || c.subject.kind === "WALLET") c.subject = { ...c.subject, kind: c.addressKind };

    if (isContract) {
      const dexAll = await step("dexscreener", async () => {
        const lists = await Promise.all(contracts.map((h) => dexToken(chainById(h.chainId)!.dex, address).catch(() => [])));
        return lists.flat().sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
      }, (v) => `${v.length} pool${v.length === 1 ? "" : "s"}`);
      c.dex = dexAll;
      c.chainId = hint && contracts.some((h) => h.chainId === hint) ? hint : dexAll?.[0]?.chainId ?? contracts[0].chainId;
      if (c.dex) c.dex = c.dex.filter((p) => p.chainId === c.chainId);
      const cid = c.chainId;
      const [tok, es] = await Promise.all([
        step("goplus-token", () => goplusToken(cid, address), (v) => v?.token_name ? `${v.token_name} analysed` : "Analysed"),
        env.etherscan ? step("etherscan", () => etherscan(cid, address, env.etherscan!, true), (v) => v.creation ? "Deployment found" : "Read") : Promise.resolve(notRun("etherscan", "Needs an Etherscan API key (ETHERSCAN_API_KEY)")),
      ]);
      c.goToken = tok;
      c.es = es ?? undefined;
      const creator = c.es?.creation?.creator ?? tok?.creator_address;
      const [dep, bl, ab, same] = await Promise.all([
        creator ? step("goplus-address", async () => ({ ...(await goplusAddress(cid, creator)), address: creator }), (v) => v.flags.length ? `Deployer: ${v.flags.length} labels` : "Deployer: no labels") : Promise.resolve(notRun("goplus-address", "Deployer address unknown")),
        step("blocklists", () => blocklists({ address }), (v) => `Checked ${v.checked.join(", ")}`),
        env.chainabuse ? step("chainabuse", () => chainabuse({ address }, env.chainabuse!), (v) => v ? `${v.count} reports` : "") : Promise.resolve(notRun("chainabuse", "Needs a Chainabuse API key (CHAINABUSE_API_KEY)")),
        tok?.token_name && c.subject.kind === "CONTRACT" && runs.get("name-search")!.status === "queued"
          ? step("name-search", async () => pairsToCandidates(await dexSearch(tok.token_name!))
            .filter((x) => x.address.toLowerCase() !== address && (x.name.toLowerCase() === tok.token_name!.toLowerCase() || x.symbol.toLowerCase() === (tok.token_symbol ?? "").toLowerCase()))
            .slice(0, 3), (v) => `${v.length} other token${v.length === 1 ? "" : "s"} with this name`)
          : Promise.resolve(undefined),
      ]);
      if (dep) c.goDeployer = dep;
      if (bl) c.addressLists = bl;
      c.addressAbuse = ab ?? undefined;
      if (same) c.sameName = same;
    } else if (hits.length) {
      const main = [...hits].sort((a, b) => b.nonce - a.nonce)[0];
      c.chainId = hint && hits.some((h) => h.chainId === hint) ? hint : main.chainId;
      const cid = c.chainId;
      const [ga, es, bl, ab] = await Promise.all([
        step("goplus-address", () => goplusAddress(cid, address), (v) => v.flags.length ? `${v.flags.length} labels` : "No labels"),
        env.etherscan ? step("etherscan", () => etherscan(cid, address, env.etherscan!, false), (v) => v.firstTx ? "Activity found" : "Read") : Promise.resolve(notRun("etherscan", "Needs an Etherscan API key (ETHERSCAN_API_KEY)")),
        step("blocklists", () => blocklists({ address }), (v) => `Checked ${v.checked.join(", ")}`),
        env.chainabuse ? step("chainabuse", () => chainabuse({ address }, env.chainabuse!), (v) => v ? `${v.count} reports` : "") : Promise.resolve(notRun("chainabuse", "Needs a Chainabuse API key (CHAINABUSE_API_KEY)")),
      ]);
      c.goAddress = ga;
      c.es = es ?? undefined;
      c.addressLists = bl;
      c.addressAbuse = ab ?? undefined;
    }
  }

  /* Subject first, then follow what it points to: one handle, one domain, one contract. */
  if (n.kind === "HANDLE") await handleBlock(n.value);
  else if (n.kind === "DOMAIN") await domainBlock(n.value);
  else await addressBlock(n.value, input.chainId);

  const hostOf = (u?: string | null) => {
    try { return u ? new URL(u.startsWith("http") ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase() : undefined; } catch { return undefined; }
  };
  for (let round = 0; round < 2; round++) {
    const pool = c.dex?.[0];
    const tok = c.handleTokens?.[0];
    const handle = !done.has("handle")
      ? pool?.socials.find((s) => s.type === "twitter")?.url.match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]{1,15})/i)?.[1]?.toLowerCase() ?? c.site?.handles[0]
      : undefined;
    const site = !done.has("domain")
      ? [hostOf(c.xProfile?.url), hostOf(pool?.websites[0]), hostOf(tok?.website)].find((h) => h && !NOT_PROJECT_SITE.test(h))
      : undefined;
    const addr = !done.has("address")
      ? tok?.address.toLowerCase() ?? c.site?.addresses[0] ?? c.xProfile?.description.match(/0x[a-fA-F0-9]{40}/)?.[0]?.toLowerCase()
      : undefined;
    if (!handle && !site && !addr) break;
    await Promise.all([
      handle ? handleBlock(handle) : null,
      site ? domainBlock(site) : null,
      addr ? addressBlock(addr, tok?.chainId) : null,
    ]);
  }

  /* Anything still queued had nothing to check. */
  const why: Partial<Record<SourceId, string>> = {
    "x-history": "No X account was found to check", "x-profile": "No X account was found to check", "x-about": "No X account was found to check",
    rdap: "No website was found to check", wayback: "No website was found to check", crtsh: "No website was found to check", website: "No website was found to check",
    "goplus-phishing": "No website was found to check",
    rpc: "No address was found to check", dexscreener: "No token contract to check", "goplus-token": "No token contract to check",
    "goplus-address": "No address was found to check", etherscan: "No address was found to check",
    "name-search": "Not needed for this search", blocklists: "Nothing to check", chainabuse: "Nothing to check",
  };
  for (const r of runs.values()) if (r.status === "queued") notRun(r.id, why[r.id] ?? "Not run");
  /* Name search is a helper, not evidence coverage, unless it ran. */
  if (runs.get("name-search")!.status === "not_run") runs.delete("name-search");

  if (c.chainId && (c.subject.kind === "CONTRACT" || c.subject.kind === "WALLET")) c.subject = { ...c.subject, chainId: c.chainId };
  c.runs = [...runs.values()];
  const report = buildReport(c, caseId(n.value, today), now);
  emit({ t: "report", report });
  return report;
}

export { CHAINS };
