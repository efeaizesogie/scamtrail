import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, handleHistory, summarize, type Collected } from "../lib/investigate/rules";
import { extractLinks, rootDomain } from "../lib/investigate/sources/web";
import { isContractCode } from "../lib/investigate/sources/onchain";
import { levenshtein } from "../lib/investigate/sources/reports";
import { isPrivateIp } from "../lib/investigate/http";
import { normalize } from "../lib/investigate";
import type { SourceRun } from "../lib/investigate/types";

const run = (id: SourceRun["id"], segment: SourceRun["segment"], status: SourceRun["status"], note?: string): SourceRun =>
  ({ id, label: id, segment, status, note });

const base = (over: Partial<Collected> = {}): Collected => ({
  observedAt: "2026-10-13",
  subject: { kind: "HANDLE", value: "example_new" },
  runs: [run("x-history", "SOCIAL", "done"), run("x-profile", "SOCIAL", "not_run", "Needs an X API key")],
  handle: "example_new",
  ...over,
});

const RENAMED = {
  accounts: [{
    id: "42",
    names: [
      { name: "example_old", firstSeen: "2021-01-04", lastSeen: "2022-05-01" },
      { name: "example_airdrop", firstSeen: "2022-05-02", lastSeen: "2026-03-01" },
      { name: "Example_New", firstSeen: "2026-03-02", lastSeen: "2026-07-15" },
    ],
  }],
};

test("handle history counts changes as a minimum and keeps archive casing", () => {
  const c = base({ xHistory: RENAMED });
  const hh = handleHistory(c)!;
  assert.equal(hh.status, "observed");
  assert.equal(hh.changes, 2);
  assert.equal(hh.archiveUntil, "2026-07-15");
  const r = buildReport(c, "ST-2026-TEST01", "2026-10-13T00:00:00Z");
  const f = r.findings.find((x) => x.id === "x-changes")!;
  assert.equal(f.klass, "credible");
  assert.match(f.text, /at least 3 names/);
  assert.match(f.text, /at least 2 name changes/);
  assert.match(f.text, /@Example_New/);
  assert.ok(f.limits && /minimum/.test(f.limits));
  assert.ok(r.findings.some((x) => x.id === "x-recent"), "recent rename is flagged");
  assert.ok(r.summary.some((s) => /at least 2 times/.test(s)));
});

test("a name used by several accounts picks the latest holder and flags the others", () => {
  const c = base({
    handle: "shared",
    xHistory: { accounts: [
      { id: "1", names: [{ name: "shared", firstSeen: "2015-01-01", lastSeen: "2019-01-01" }] },
      { id: "2", names: [{ name: "other", firstSeen: "2019-06-01", lastSeen: "2023-01-01" }, { name: "shared", firstSeen: "2023-01-02", lastSeen: "2026-07-01" }] },
    ] },
  });
  const hh = handleHistory(c)!;
  assert.equal(hh.account!.id, "2");
  assert.equal(hh.others.length, 1);
  const r = buildReport(c, "ST", "2026-10-13T00:00:00Z");
  assert.ok(r.findings.some((f) => f.id === "x-shared"));
});

test("no archive record is UNKNOWN and never shows a count", () => {
  const c = base({ xHistory: null, runs: [run("x-history", "SOCIAL", "empty")] });
  const hh = handleHistory(c)!;
  assert.equal(hh.status, "unavailable");
  const r = buildReport(c, "ST", "2026-10-13T00:00:00Z");
  const f = r.findings.find((x) => x.id === "x-changes")!;
  assert.equal(f.klass, "unknown");
  assert.doesNotMatch(f.text, /\d+ name change/);
});

test("coverage counts ran sources and lists not-run reasons in limits", () => {
  const r = buildReport(base({ xHistory: RENAMED }), "ST", "2026-10-13T00:00:00Z");
  const social = r.coverage.find((x) => x.segment === "SOCIAL")!;
  assert.deepEqual(social, { segment: "SOCIAL", ran: 1, total: 2 });
  assert.ok(r.limits.some((l) => /x-profile: Needs an X API key/.test(l)));
});

test("contract flags are CREDIBLE, deploys are CONFIRMED, empty reports say not the same as safe", () => {
  const c: Collected = {
    observedAt: "2026-10-13",
    subject: { kind: "CONTRACT", value: "0xabc0000000000000000000000000000000000001" },
    address: "0xabc0000000000000000000000000000000000001",
    addressKind: "CONTRACT",
    chainId: 1,
    runs: [run("rpc", "ON-CHAIN", "done"), run("goplus-token", "ON-CHAIN", "done"), run("blocklists", "REPORTS", "done")],
    rpc: { hits: [{ chainId: 1, name: "Ethereum", isContract: true, nonce: 1, balance: "0" }], failed: [] },
    goToken: { token_name: "Example", token_symbol: "EXM", is_mintable: "1", owner_address: "0x1111111111111111111111111111111111111111", is_honeypot: "1", sell_tax: "0.25", buy_tax: "0",
      lp_holders: [{ address: "0x2222222222222222222222222222222222222222", percent: "0.9", is_locked: 0, is_contract: 0 }] },
    es: { creation: { creator: "0x3333333333333333333333333333333333333333", txHash: "0xdead", block: "100", timestamp: "2026-01-02T00:00:00.000Z" }, verified: false },
    dex: [{ chainId: 1, chain: "Ethereum", dex: "uniswap", url: "https://dexscreener.com/x", pairAddress: "0x4444", baseName: "Example", baseSymbol: "EXM", baseAddress: "0xabc", liquidityUsd: 5000, fdv: null, createdAt: Date.parse("2026-01-04"), websites: [], socials: [] }],
    addressLists: { checked: ["MetaMask"], metamask: false, scamsniffer: false, lookalikeOf: null },
  };
  const r = buildReport(c, "ST", "2026-10-13T00:00:00Z");
  const by = (id: string) => r.findings.find((f) => f.id === id);
  assert.equal(by("es-deploy")!.klass, "confirmed");
  assert.equal(by("gp-honeypot")!.klass, "credible");
  assert.equal(by("gp-mint")!.text, "The owner can mint new tokens.");
  assert.match(by("gp-tax")!.text, /sell tax 25%/);
  assert.match(by("gp-lp")!.text, /90% of pool LP tokens sit in ordinary wallets/);
  assert.match(by("x-deploy-pool")!.text, /2 days after deployment/);
  assert.equal(by("reports-none")!.klass, "unknown");
  assert.match(by("reports-none")!.text, /not the same as safe/);
  assert.equal(r.findings[0].id, "gp-honeypot", "strongest finding sorts first");
});

test("summary never uses verdict words", () => {
  const lines = summarize([
    { id: "a", klass: "credible", topic: "SOCIAL", text: "", source: "", observedAt: "", eventAt: null, weight: 9, summary: "This is a scam." },
    { id: "b", klass: "unknown", topic: "REPORTS", text: "", source: "", observedAt: "", eventAt: null, weight: 8, summary: "No match, which is not the same as safe." },
    { id: "c", klass: "credible", topic: "REPORTS", text: "", source: "", observedAt: "", eventAt: null, weight: 7, summary: "The project looks safe." },
  ], []);
  assert.ok(!lines.some((l) => /scam/i.test(l)));
  assert.ok(!lines.some((l) => /looks safe/i.test(l)));
  assert.ok(lines.some((l) => /not the same as safe/.test(l)));
});

test("thread links: mutual links are CONFIRMED, a site pointing elsewhere is flagged", () => {
  const c = base({
    subject: { kind: "DOMAIN", value: "example.com" },
    handle: "example_new", xHistory: RENAMED,
    domain: "example.com",
    xProfile: { id: "42", username: "Example_New", name: "", createdAt: null, description: "", url: "https://example.com", followers: null, verified: false },
    site: { url: "https://example.com/", status: 200, title: null, handles: ["example_new"], addresses: [], https: true },
  });
  const r = buildReport(c, "ST", "2026-10-13T00:00:00Z");
  assert.equal(r.thread.links[0].klass, "confirmed");
  const c2 = { ...c, site: { ...c.site!, handles: ["someone_else"] } };
  const r2 = buildReport(c2, "ST", "2026-10-13T00:00:00Z");
  assert.equal(r2.thread.links[0].klass, "unverified");
  assert.ok(r2.findings.some((f) => f.id === "x-site-mismatch"));
});

test("helpers", () => {
  assert.equal(rootDomain("app.example.co.uk"), "example.co.uk");
  assert.equal(rootDomain("www.example.com"), "example.com");
  assert.equal(levenshtein("metamask.io", "metamaks.io"), 2);
  assert.equal(levenshtein("opensea.io", "opensae.io"), 2);
  assert.equal(levenshtein("uniswap.org", "unisvap.org"), 1);
  assert.ok(isPrivateIp("10.0.0.1") && isPrivateIp("127.0.0.1") && isPrivateIp("169.254.169.254") && isPrivateIp("::1") && isPrivateIp("::ffff:192.168.1.1"));
  assert.ok(!isPrivateIp("1.1.1.1") && !isPrivateIp("2606:4700::1111"));
  assert.ok(!isContractCode("0x"));
  assert.ok(!isContractCode("0xef010063c0c19a282a1b52b07dd5a65b58948a07dae32b"));
  assert.ok(isContractCode("0x6080604052"));
  const links = extractLinks(`<a href="https://x.com/Example_New">x</a><a href="https://twitter.com/intent/tweet">s</a><meta name="twitter:site" content="@OtherOne"> 0x6982508145454Ce325dDbE47a25d4ec3d2311933 <title>Example</title>`);
  assert.deepEqual(links.handles.sort(), ["example_new", "otherone"]);
  assert.deepEqual(links.addresses, ["0x6982508145454ce325ddbe47a25d4ec3d2311933"]);
  assert.equal(links.title, "Example");
});

test("query normalisation", () => {
  assert.deepEqual(normalize({ q: "https://x.com/Example_New?s=20" }), { kind: "HANDLE", value: "example_new" });
  assert.deepEqual(normalize({ q: "@Example" }), { kind: "HANDLE", value: "example" });
  assert.deepEqual(normalize({ q: "https://www.Example.com/path?a=1" }), { kind: "DOMAIN", value: "example.com" });
  assert.deepEqual(normalize({ q: "0xABC0000000000000000000000000000000000001" }), { kind: "ADDRESS", value: "0xabc0000000000000000000000000000000000001" });
  assert.deepEqual(normalize({ q: "Example Protocol" }), { kind: "PROJECT", value: "Example Protocol" });
});

test("generated report copy follows the house copy rules", () => {
  const c: Collected = {
    observedAt: "2026-10-13",
    subject: { kind: "DOMAIN", value: "examp1e.com" },
    runs: [run("rdap", "WEBSITE", "done"), run("blocklists", "REPORTS", "done"), run("chainabuse", "REPORTS", "done"), run("etherscan", "ON-CHAIN", "failed", "Rate limited")],
    handle: "example_new", xHistory: RENAMED,
    xProfile: { id: "42", username: "Example_New", name: "", createdAt: "2021-01-01T00:00:00Z", description: "", url: "https://other.com", followers: 1200, verified: false },
    domain: "examp1e.com",
    rdap: { registered: "2026-09-20T00:00:00Z", changed: null, expires: "2026-11-01T00:00:00Z", registrar: "Example Registrar, Inc.", status: [], url: "https://rdap.org/domain/examp1e.com" },
    wayback: { first: "2019-01-01", last: null, months: null, capped: false },
    crt: { firstIssued: "2026-09-21", count: 2, subdomains: ["app.examp1e.com"] },
    site: { url: "https://examp1e.com/", status: 200, title: "Example", handles: ["someone_else"], addresses: ["0x9990000000000000000000000000000000000009"], https: true },
    domainLists: { checked: ["MetaMask"], metamask: true, scamsniffer: true, lookalikeOf: "example.com" },
    phishing: { phishing: true },
    domainAbuse: { count: 3, latest: "2026-10-01", categories: ["phishing"], url: "https://www.chainabuse.com/domain/examp1e.com" },
    address: "0x9990000000000000000000000000000000000009", addressKind: "CONTRACT", chainId: 1,
    rpc: { hits: [{ chainId: 1, name: "Ethereum", isContract: true, nonce: 1, balance: "0" }], failed: [] },
    goToken: { token_name: "Example", token_symbol: "EXM", is_honeypot: "1", cannot_sell_all: "1", honeypot_with_same_creator: "2", hidden_owner: "1", can_take_back_ownership: "1", selfdestruct: "1", slippage_modifiable: "1", transfer_pausable: "1", is_blacklisted: "1", is_proxy: "1", is_mintable: "1", owner_address: "0x1111111111111111111111111111111111111111", buy_tax: "0.12", sell_tax: "0.3",
      holders: [{ address: "0x5555555555555555555555555555555555555555", percent: "0.8" }], is_in_cex: { cex_list: ["A", "B", "C", "D", "E"] } },
    goDeployer: { flags: ["phishing", "theft"], dataSource: "SlowMist", address: "0x3333333333333333333333333333333333333333" },
    dex: [{ chainId: 1, chain: "Ethereum", dex: "uniswap", url: "https://dexscreener.com/x", pairAddress: "0x4444", baseName: "Example", baseSymbol: "EXM", baseAddress: "0x999", liquidityUsd: 900, fdv: null, createdAt: Date.parse("2026-09-25"), websites: ["https://examp1e.com"], socials: [{ type: "twitter", url: "https://x.com/another_one" }] }],
    sameName: [{ name: "Example", symbol: "EXM", chain: "Base", chainId: 8453, address: "0x7770000000000000000000000000000000000007", liquidityUsd: 10, source: "DexScreener" }],
  };
  const r = buildReport(c, "ST", "2026-10-13T00:00:00Z");
  const copy = [...r.summary, ...r.limits, ...r.findings.flatMap((f) => [f.text, f.limits ?? "", f.summary ?? ""]),
    ...r.thread.links.map((l) => l.note), ...r.onchain.map((f) => f.value), ...r.domain.map((f) => f.value)].filter(Boolean);
  assert.ok(r.findings.length > 25, `expected a broad fixture, got ${r.findings.length} findings`);
  const BANNED = /\b(delve|seamless|game-changing|cutting-edge|unlock|elevate|journey|landscape|leverage|robust|scams?|scammers?|legit|guarantee[sd]?)\b/i;
  for (const line of copy) {
    assert.doesNotMatch(line, BANNED, line);
    assert.doesNotMatch(line, /—|!|\?/, line);
    assert.doesNotMatch(line, /\bnot just\b/i, line);
    assert.doesNotMatch(line, /\.\./, `double period: ${line}`);
    if (/\bsafe\b/i.test(line)) assert.match(line, /not the same as safe/, `"safe" only appears as "not the same as safe": ${line}`);
  }
  assert.ok(r.findings.some((f) => f.id === "x-reregistered"));
  assert.ok(r.findings.some((f) => f.klass === "complaint"));
  assert.ok(r.findings.some((f) => f.klass === "misattributed"));
  assert.ok(!r.findings.some((f) => f.id === "reports-none"), "no 'nothing found' line when lists matched");
});
