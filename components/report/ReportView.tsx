"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Connector, GrammarSwatch } from "../Connector";
import { SvgNode } from "../Node";
import { PixelGlyph } from "../Glyph";
import { SearchBox } from "../SearchBox";
import { EASE_OUT, gsap } from "@/lib/gsap";
import type { Candidate, Fact, Finding, Klass, Report, SourceRun, StreamEvent, ThreadNode } from "@/lib/investigate/types";
import { CoverageLegend, CoverageRing, FindingRow, KLASS_LABEL, lineOf, TrailReplay } from "./parts";

type Phase = "running" | "done" | "candidates" | "error";

const SEGMENTS = ["SOCIAL", "ON-CHAIN", "WEBSITE", "REPORTS"] as const;
const KLASS_ORDER: Klass[] = ["confirmed", "credible", "complaint", "unverified", "misattributed", "unknown"];
const KIND_LABEL: Record<string, string> = { HANDLE: "X HANDLE", WALLET: "WALLET", CONTRACT: "CONTRACT", DOMAIN: "DOMAIN", PROJECT: "PROJECT NAME" };
const short = (v: string) => (v.length > 24 ? `${v.slice(0, 10)}…${v.slice(-8)}` : v);
const display = (kind: string, v: string) => (kind === "HANDLE" ? `@${v}` : v);
const fmtUsd = (v: number | null) => (v == null ? "Liquidity unknown" : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M liquidity` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K liquidity` : `$${Math.round(v)} liquidity`);

/* ---------- streaming ---------- */

function useInvestigation(q: string, type: string | null, chainId: number | null) {
  const [phase, setPhase] = useState<Phase>("running");
  const [runs, setRuns] = useState<SourceRun[]>([]);
  const [meta, setMeta] = useState<{ caseId: string; subject: Report["subject"] } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!q) return;
    const ctrl = new AbortController();
    setPhase("running"); setRuns([]); setMeta(null); setReport(null); setCandidates([]); setError("");
    (async () => {
      try {
        const res = await fetch("/api/investigate", {
          method: "POST", headers: { "content-type": "application/json" }, signal: ctrl.signal,
          body: JSON.stringify({ q, type, chainId }),
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "The investigation could not start.");
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let ended = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const e = JSON.parse(line) as StreamEvent;
            if (e.t === "start") { setMeta({ caseId: e.caseId, subject: e.subject }); setRuns(e.sources); }
            else if (e.t === "source") setRuns((rs) => rs.some((r) => r.id === e.run.id) ? rs.map((r) => (r.id === e.run.id ? e.run : r)) : [...rs, e.run]);
            else if (e.t === "report") { setReport(e.report); setRuns(e.report.sources); setPhase("done"); ended = true; }
            else if (e.t === "candidates") { setCandidates(e.candidates); setPhase("candidates"); ended = true; }
            else if (e.t === "error") throw new Error(e.message);
          }
        }
        if (!ended) throw new Error("The connection closed before the report was finished.");
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setPhase("error");
      }
    })();
    return () => ctrl.abort();
  }, [q, type, chainId]);

  return { phase, runs, meta, report, candidates, error };
}

/* ---------- pieces ---------- */

function SourceLine({ status }: { status: SourceRun["status"] }) {
  if (status === "running") {
    return (
      <svg width={28} height={8} viewBox="0 0 28 8" aria-hidden="true" className="shrink-0">
        <line x1={1} y1={4} x2={27} y2={4} className="ev-complaint ev-running" />
      </svg>
    );
  }
  const state = status === "done" ? "confirmed" : status === "empty" ? "credible" : status === "queued" ? "unverified" : "unknown";
  return <GrammarSwatch state={state} width={28} />;
}

const STATUS_LABEL: Record<SourceRun["status"], string> = {
  queued: "QUEUED", running: "CHECKING", done: "RETURNED", empty: "NO RECORDS", failed: "FAILED", not_run: "NOT RUN",
};

function Progress({ runs }: { runs: SourceRun[] }) {
  return (
    <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
      {SEGMENTS.map((seg) => {
        const rs = runs.filter((r) => r.segment === seg);
        if (!rs.length) return null;
        return (
          <div key={seg}>
            <p className="t-micro text-text-muted">{seg}</p>
            <ul className="mt-3 divide-y divide-line/10 border-y hairline">
              {rs.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-3 text-small">
                  <span className="mt-[7px]"><SourceLine status={r.status} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{r.label}</span>
                    {r.note && <span className="block text-[12px] text-text-muted">{r.note}</span>}
                  </span>
                  <span className={`t-micro shrink-0 pt-[3px] ${r.status === "done" ? "text-text" : "text-text-muted"}`}>
                    {STATUS_LABEL[r.status]}{r.ms ? <span className="ml-2 font-mono normal-case">{(r.ms / 1000).toFixed(1)}s</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, children, aside, className = "" }: { title: string; children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <section className={`reveal rounded-card border hairline-strong bg-canvas ${className}`} aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b hairline px-5 py-4 md:px-8">
        <h2 className="t-label">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const POS: Record<string, [number, number]> = { HANDLE: [120, 60], DOMAIN: [480, 60], CONTRACT: [300, 210], WALLET: [300, 210] };
const GLYPH = { HANDLE: "handle", DOMAIN: "domain", CONTRACT: "contract", WALLET: "wallet" } as const;

function Thread({ nodes, links }: Report["thread"]) {
  if (nodes.length < 2) return null;
  const at = (id: string) => POS[nodes.find((n) => n.id === id)!.kind];
  const name = (n: ThreadNode) => (n.kind === "CONTRACT" || n.kind === "WALLET" ? `${n.value.slice(0, 6)}…${n.value.slice(-4)}` : n.value.length > 20 ? `${n.value.slice(0, 19)}…` : n.value);
  return (
    <Card title="IDENTITY THREAD" aside={<p className="t-micro text-text-muted">HOW THE NAMES POINT AT EACH OTHER</p>}>
      <div className="grid gap-6 px-5 py-6 md:grid-cols-[3fr_2fr] md:items-center md:px-8">
        <svg viewBox="0 0 600 320" className="h-auto w-full" role="img" aria-label="Links between the handle, website and contract">
          {links.map((l, i) => {
            const [x1, y1] = at(l.from), [x2, y2] = at(l.to);
            const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
            return <Connector key={i} d={`M${x1 + ux * 30} ${y1 + uy * 30} L${x2 - ux * 30} ${y2 - uy * 30}`} state={lineOf(l.klass)}
              fade={[x1, y1, x2, y2]} scrollDriven />;
          })}
          {nodes.map((n) => {
            const [x, y] = POS[n.kind];
            return (
              <g key={n.id}>
                <SvgNode x={x} y={y} glyph={GLYPH[n.kind]} state={n.subject ? "confirmed" : "credible"} active={n.subject} />
                <text x={x} y={y + 50} textAnchor="middle" className="fill-text-muted" style={{ fontSize: 13, letterSpacing: "0.06em", fontWeight: 500 }}>{n.kind}{n.subject ? " · SEARCHED" : ""}</text>
                <text x={x} y={y + 72} textAnchor="middle" className="fill-text font-mono" style={{ fontSize: 16 }}>{name(n)}</text>
              </g>
            );
          })}
        </svg>
        <ul className="space-y-3">
          {links.map((l, i) => {
            const a = nodes.find((n) => n.id === l.from)!, b = nodes.find((n) => n.id === l.to)!;
            return (
              <li key={i} className="flex items-start gap-3 text-small">
                <span className="mt-[7px]"><GrammarSwatch state={lineOf(l.klass)} width={28} /></span>
                <span><span className="t-micro block text-text-muted">{a.kind} ↔ {b.kind} · {KLASS_LABEL[l.klass]}</span>{l.note}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

function HandleCard({ h }: { h: NonNullable<Report["handle"]> }) {
  const names = h.account?.names ?? [];
  return (
    <Card title="X NAME HISTORY" aside={<p className="t-micro text-text-muted">@{h.handle}{h.account ? <> · ACCOUNT ID <span className="font-mono">{h.account.id}</span></> : null}</p>}>
      <div className="grid gap-8 px-5 py-6 md:grid-cols-[220px_1fr] md:px-8">
        <div>
          <p className="t-micro text-text-muted">NAME CHANGES OBSERVED</p>
          {h.status === "observed"
            ? <p className="mt-2 text-display-sm leading-none">{h.changes}</p>
            : <p className="t-heading-sm mt-2">UNKNOWN</p>}
          <p className="mt-3 text-small text-text-muted">
            {h.status === "observed" ? `${h.changes ? `At least ${h.changes}.` : "None in the archive."} ${names.length} ${names.length === 1 ? "name" : "names"} seen.` : h.status === "not_run" ? "Not checked." : "Not countable. No history returned."}
          </p>
        </div>
        <div>
          {names.length ? (
            <ol className="relative space-y-0">
              {names.map((n, i) => (
                <li key={n.name} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b hairline py-3 last:border-0">
                  <GrammarSwatch state={i === names.length - 1 ? "credible" : "complaint"} width={28} />
                  <span className="truncate font-mono text-small">@{n.name}</span>
                  <span className="font-mono text-[12px] text-text-muted">{n.firstSeen ?? "?"} → {n.lastSeen ?? "?"}</span>
                </li>
              ))}
              <li className="grid grid-cols-[28px_1fr] items-center gap-3 pt-3">
                <GrammarSwatch state="unknown" width={28} />
                <span className="text-[12px] text-text-muted">History after {h.archiveUntil ?? "the archive's last capture"} is unavailable.</span>
              </li>
            </ol>
          ) : (
            <p className="flex items-center gap-3 text-small"><GrammarSwatch state="unknown" width={28} />{h.note}</p>
          )}
          {h.others.length > 0 && (
            <p className="mt-4 text-small text-text-muted">
              The name was also used by {h.others.length === 1 ? "another account" : `${h.others.length} other accounts`}: {h.others.map((o) => `ID ${o.id} (${o.names.map((n) => `@${n.name}`).join(", ")})`).join("; ")}.
            </p>
          )}
          {names.length > 0 && <p className="mt-4 text-[12px] text-text-muted">{h.note} Source: memory.lol public name archive. Dashed lines mark earlier names, the solid line the latest; the fading line marks where the record ends.</p>}
        </div>
      </div>
    </Card>
  );
}

function Facts({ title, facts }: { title: string; facts: Fact[] }) {
  if (!facts.length) return null;
  return (
    <Card title={title}>
      <dl className="divide-y divide-line/10">
        {facts.map((f) => (
          <div key={f.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-4 px-5 py-3 md:px-8">
            <dt className="t-micro flex items-center gap-2 text-text-muted"><GrammarSwatch state={lineOf(f.klass)} width={18} />{f.label}</dt>
            <dd className={`min-w-0 break-words text-small ${f.klass === "unknown" ? "text-text-muted" : ""}`}>
              {f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer" className="underline decoration-line/40 underline-offset-2 hover:decoration-text">{f.value}</a> : f.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Findings({ findings }: { findings: Finding[] }) {
  const groups = KLASS_ORDER.map((k) => ({ k, items: findings.filter((f) => f.klass === k) })).filter((g) => g.items.length);
  return (
    <Card title="FINDINGS" aside={<p className="t-micro text-text-muted">{findings.length} FROM {new Set(findings.map((f) => f.source)).size} SOURCES</p>}>
      {groups.length ? groups.map((g) => (
        <div key={g.k} className="border-b hairline last:border-0">
          <p className="t-micro flex items-center gap-2 px-5 pt-5 text-text-muted md:px-8"><GrammarSwatch state={lineOf(g.k)} width={22} />{KLASS_LABEL[g.k]} · {g.items.length}</p>
          <ul className="divide-y divide-line/10">
            {g.items.map((f) => (
              <FindingRow key={f.id} f={{ klass: f.klass, text: f.text, source: f.source, sourceUrl: f.sourceUrl, observed: f.observedAt, happened: f.eventAt, limits: f.limits }} />
            ))}
          </ul>
        </div>
      )) : <p className="px-5 py-6 text-small text-text-muted md:px-8">No records returned. This is not the same as safe.</p>}
    </Card>
  );
}

function Candidates({ q, candidates }: { q: string; candidates: Candidate[] }) {
  const router = useRouter();
  return (
    <div className="page mt-12">
      <p className="t-micro text-text-muted">PROJECT NAME · {q}</p>
      <h1 className="t-heading mt-3">{candidates.length ? "Confirm which project you mean." : "No token matched this name."}</h1>
      <p className="mt-4 max-w-measure text-text-muted">
        {candidates.length
          ? "Several tokens use this name. Pick the one you are checking; tokens with copied names are common, so compare the chain, address and links."
          : "Try the project's X handle, contract address or website. No match is not the same as safe."}
      </p>
      {candidates.length > 0 && (
        <ul className="mt-10 divide-y divide-line/10 border-y hairline">
          {candidates.map((c) => (
            <li key={`${c.chainId}:${c.address}`}>
              <button type="button" onClick={() => router.push(`/report?${new URLSearchParams({ q: c.address, type: "CONTRACT", chain: String(c.chainId) })}`)}
                className="grid w-full gap-2 px-2 py-4 text-left transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised md:grid-cols-[1.4fr_1fr_1.3fr_1fr] md:items-center md:gap-6">
                <span><span className="block">{c.name} <span className="text-text-muted">({c.symbol})</span></span>
                  {c.twitter && <span className="block font-mono text-[12px] text-text-muted">@{c.twitter}</span>}</span>
                <span className="t-micro text-text-muted">{c.chain}</span>
                <span className="font-mono text-small">{short(c.address)}</span>
                <span className="text-small text-text-muted md:text-right">{fmtUsd(c.liquidityUsd)} · {c.source}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- page ---------- */

export function ReportView() {
  const params = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const type = params.get("type");
  const chain = params.get("chain");
  const chainId = chain && /^\d+$/.test(chain) ? Number(chain) : null;
  const { phase, runs, meta, report, candidates, error } = useInvestigation(q, type, chainId);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // The report assembles itself once it lands.
  useEffect(() => {
    if (!report || !bodyRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rows = bodyRef.current.querySelectorAll("li, dl > div");
    const tween = gsap.fromTo(rows, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE_OUT, stagger: 0.015, delay: 0.2 });
    return () => { tween.kill(); };
  }, [report]);

  const subject = report?.subject ?? meta?.subject;
  const kind = subject?.kind ?? (type === "HANDLE" ? "HANDLE" : type === "DOMAIN" ? "DOMAIN" : "PROJECT");
  const segments = useMemo(() => SEGMENTS.map((s) => {
    const rs = runs.filter((r) => r.segment === s);
    return { label: s, ran: rs.filter((r) => r.status === "done" || r.status === "empty").length, total: rs.length };
  }), [runs]);

  if (!q) {
    return (
      <div className="page pt-32">
        <h1 className="t-heading">Start with one name.</h1>
        <div className="mt-8 max-w-[680px]"><SearchBox label="SEARCH" /></div>
      </div>
    );
  }

  const downloadJson = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.caseId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="pb-section-gap pt-28">
      <div className="page">
        <div className="max-w-[680px]"><SearchBox key={q} initial={q} label="NEW SEARCH" /></div>
      </div>

      {phase === "candidates" ? <Candidates q={q} candidates={candidates} /> : (
        <>
          {/* Header */}
          <div className="page mt-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="t-micro rounded-tag border hairline-strong px-2 py-1">{KIND_LABEL[kind] ?? kind}</span>
              {meta && <span className="font-mono text-small text-text-muted">{meta.caseId}</span>}
              {report?.subject.chainId ? (
                <span className="t-micro text-text-muted">
                  <span className="text-text">{report.chains.find((c) => c.chainId === report.subject.chainId)?.name}</span>
                  {report.chains.length > 1 && ` · ALSO ON ${report.chains.filter((c) => c.chainId !== report.subject.chainId).map((c) => c.name).join(", ")}`}
                </span>
              ) : report?.chains.length ? <span className="t-micro text-text-muted">{report.chains.map((c) => c.name).join(" · ")}</span> : null}
            </div>
            <h1 className="mt-4 break-all font-mono text-[28px] leading-tight md:text-[40px]">{subject ? display(subject.kind, subject.value) : q}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="text-small text-text-muted" aria-live="polite">
                {phase === "running" && `Checking ${runs.filter((r) => r.status === "done" || r.status === "empty" || r.status === "failed" || r.status === "not_run").length} of ${runs.length || "…"} sources.`}
                {phase === "done" && report && `Report generated ${report.generatedAt.slice(0, 16).replace("T", " ")} UTC.`}
                {phase === "error" && error}
              </p>
              {report && (
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost" onClick={copyLink}>{copied ? "LINK COPIED" : "COPY LINK"}</button>
                  <button type="button" className="btn-ghost" onClick={downloadJson}>DOWNLOAD JSON</button>
                </div>
              )}
            </div>
          </div>

          {phase === "error" && (
            <div className="page mt-8">
              <button type="button" className="btn-primary" onClick={() => window.location.reload()}><PixelGlyph />TRY AGAIN</button>
            </div>
          )}

          {/* Summary and coverage */}
          {report && (
            <div className="page mt-10">
              <section className="reveal grid gap-8 rounded-card border hairline-strong bg-canvas px-5 py-6 md:grid-cols-[1fr_auto] md:px-8" aria-label="Summary">
                <div>
                  <p className="t-micro text-text-muted">SUMMARY</p>
                  <ul className="mt-3 space-y-2">
                    {report.summary.map((s) => <li key={s} className="max-w-[640px]">{s}</li>)}
                  </ul>
                </div>
                <div className="flex items-center gap-5">
                  <CoverageRing segments={report.coverage.map((c) => ({ label: c.segment, ran: c.ran, total: c.total }))} />
                  <CoverageLegend segments={report.coverage.map((c) => ({ label: c.segment, ran: c.ran, total: c.total }))} />
                </div>
              </section>
            </div>
          )}

          {/* Per-source progress */}
          <div className="page mt-10">
            <details open={phase !== "done"} className="group rounded-card border hairline px-5 py-5 md:px-8">
              <summary className="t-label flex cursor-pointer list-none items-center justify-between gap-4">
                <span>SOURCES</span>
                <span className="flex items-center gap-4">
                  {phase === "running" && <CoverageRing segments={segments} size={28} />}
                  <span className="t-micro text-text-muted group-open:hidden">SHOW</span>
                  <span className="t-micro hidden text-text-muted group-open:inline">HIDE</span>
                </span>
              </summary>
              <div className="mt-6"><Progress runs={runs} /></div>
            </details>
          </div>

          {report && (
            <div ref={bodyRef} className="page mt-10 space-y-10">
              <Thread {...report.thread} />
              {report.handle && <HandleCard h={report.handle} />}
              <Findings findings={report.findings} />
              <div className="grid gap-10 lg:grid-cols-2">
                <Facts title="ON-CHAIN FACTS" facts={report.onchain} />
                <Facts title="DOMAIN FACTS" facts={report.domain} />
              </div>
              {report.trail.length > 0 && (
                <Card title="TRAIL">
                  <div className="px-5 py-6 md:px-8"><TrailReplay events={report.trail} id="trail" /></div>
                  <ol className="divide-y divide-line/10 border-t hairline">
                    {report.trail.map((e, i) => (
                      <li key={i} className="grid grid-cols-[96px_100px_1fr] gap-4 px-5 py-3 text-small md:px-8">
                        <span className="font-mono text-text-muted">{e.date}</span>
                        <span className="t-micro pt-[3px] text-text-muted">{e.kind}</span>
                        <span className="min-w-0 break-words">{e.href ? <a href={e.href} target="_blank" rel="noopener noreferrer" className="underline decoration-line/40 underline-offset-2">{e.value}</a> : e.value}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
              <Card title="LIMITS OF THIS CHECK">
                <ul className="space-y-2 px-5 py-6 md:px-8">
                  {report.limits.map((l) => <li key={l} className="flex items-start gap-3 text-small text-text-muted"><span className="mt-[7px]"><GrammarSwatch state="unknown" width={22} /></span>{l}</li>)}
                </ul>
              </Card>
              <p className="max-w-measure text-small text-text-muted">
                ScamTrail supports your decision. It does not guarantee that a project is safe or determine wrongdoing from a single signal.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
