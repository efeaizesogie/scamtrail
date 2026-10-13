/** Shared types for the investigation engine and the report page. */

export type Klass = "confirmed" | "credible" | "complaint" | "unverified" | "unknown" | "misattributed";
export type Segment = "SOCIAL" | "ON-CHAIN" | "WEBSITE" | "REPORTS";
export type SubjectKind = "HANDLE" | "WALLET" | "CONTRACT" | "DOMAIN" | "PROJECT";

export type SourceId =
  | "x-history" | "x-profile" | "x-about"
  | "rpc" | "etherscan" | "goplus-token" | "goplus-address" | "dexscreener" | "name-search"
  | "rdap" | "wayback" | "crtsh" | "website"
  | "blocklists" | "goplus-phishing" | "chainabuse";

export type SourceStatus = "queued" | "running" | "done" | "empty" | "failed" | "not_run";

export type SourceRun = {
  id: SourceId;
  label: string;
  segment: Segment;
  status: SourceStatus;
  /** Why it failed, why it did not run, or what it returned in a few words. */
  note?: string;
  url?: string;
  ms?: number;
};

export type Finding = {
  id: string;
  klass: Klass;
  topic: Segment | "IDENTITY";
  text: string;
  source: string;
  sourceUrl?: string;
  /** ISO date the source was read. */
  observedAt: string;
  /** ISO date the event happened, or null when unknown. */
  eventAt: string | null;
  limits?: string;
  /** Higher sorts first and feeds the summary. */
  weight: number;
  /** Optional plain sentence for the summary. */
  summary?: string;
};

export type HandleName = { name: string; firstSeen: string | null; lastSeen: string | null };
export type HandleAccount = { id: string; names: HandleName[] };

export type HandleHistory = {
  handle: string;
  status: "observed" | "unavailable" | "not_run";
  /** The account that currently holds the handle, or the only account found. */
  account?: HandleAccount;
  /** Other accounts that used the same name at some point. */
  others: HandleAccount[];
  /** Names minus one for the main account. A lower bound, never a full count. */
  changes: number;
  archiveUntil: string | null;
  note: string;
  /** X's own count of username changes, from the account's About metadata, when available. */
  reported?: { count: number; lastChangeAt: string | null };
};

export type Fact = { label: string; value: string; href?: string; klass: Klass };

export type TrailKind = "HANDLE" | "DOMAIN" | "CONTRACT" | "POOL" | "ACTIVITY";
export type TrailEvent = { date: string; kind: TrailKind; value: string; klass: Klass; href?: string };

export type ThreadNodeKind = "HANDLE" | "DOMAIN" | "CONTRACT" | "WALLET";
export type ThreadNode = { id: string; kind: ThreadNodeKind; value: string; subject?: boolean };
export type ThreadLink = { from: string; to: string; klass: Klass; note: string };

export type Candidate = {
  name: string;
  symbol: string;
  chain: string;
  chainId: number;
  address: string;
  liquidityUsd: number | null;
  website?: string;
  twitter?: string;
  source: string;
};

export type ChainHit = { chainId: number; name: string; isContract: boolean; nonce: number; balance: string };

export type Report = {
  caseId: string;
  query: string;
  subject: { kind: SubjectKind; value: string; label?: string; chainId?: number };
  generatedAt: string;
  chains: ChainHit[];
  summary: string[];
  coverage: { segment: Segment; ran: number; total: number }[];
  sources: SourceRun[];
  findings: Finding[];
  handle?: HandleHistory;
  onchain: Fact[];
  domain: Fact[];
  trail: TrailEvent[];
  thread: { nodes: ThreadNode[]; links: ThreadLink[] };
  limits: string[];
};

export type StreamEvent =
  | { t: "start"; caseId: string; subject: Report["subject"]; sources: SourceRun[] }
  | { t: "source"; run: SourceRun }
  | { t: "candidates"; query: string; candidates: Candidate[] }
  | { t: "report"; report: Report }
  | { t: "error"; message: string };
