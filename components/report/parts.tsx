"use client";
import { useState } from "react";
import { GrammarSwatch, STATE_LABEL } from "../Connector";
import type { Evidence } from "../Node";
import type { Klass } from "@/lib/investigate/types";

/** Misattributed results share the fading "unknown" line, with their own label. */
export const lineOf = (k: Klass): Evidence => (k === "misattributed" ? "unknown" : k);
export const KLASS_LABEL: Record<Klass, string> = { ...STATE_LABEL, misattributed: "MISATTRIBUTED" };

export type RingSegment = { label: string; ran: number; total: number };

/** Four-part coverage ring. Each part fills by the share of its sources that ran. */
export function CoverageRing({ segments, on = true, size = 112 }: { segments: RingSegment[]; on?: boolean; size?: number }) {
  const r = 46, c = 2 * Math.PI * r, seg = c / segments.length, gap = 6;
  return (
    <svg viewBox="0 0 120 120" style={{ width: size, height: size }} className="shrink-0 -rotate-90" aria-hidden="true">
      {segments.map((s, i) => {
        const share = s.total ? s.ran / s.total : 0;
        return (
          <g key={s.label}>
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--line) / 0.18)" strokeWidth="8"
              strokeDasharray={`${seg - gap} ${c - seg + gap}`} strokeDashoffset={-i * seg} />
            {share > 0 && (
              <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--accent))" strokeWidth="8"
                strokeDasharray={`${on ? (seg - gap) * share : 0} ${c}`} strokeDashoffset={-i * seg}
                style={{ transition: `stroke-dasharray 700ms var(--ease-reveal) ${300 + i * 250}ms` }} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function CoverageLegend({ segments }: { segments: RingSegment[] }) {
  return (
    <ul className="space-y-1">
      {segments.map((s) => (
        <li key={s.label} className="t-micro flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${s.ran ? "bg-accent" : "border border-text/40"}`} aria-hidden="true" />
          {s.label}
          <span className="text-text-muted">{s.total === 0 ? "NOT RUN" : s.ran === s.total ? "RUN" : s.ran === 0 ? "NOT RUN" : `${s.ran} OF ${s.total}`}</span>
        </li>
      ))}
    </ul>
  );
}

export type Row = { klass: Klass; text: string; source: string; sourceUrl?: string; observed: string; happened: string | null; limits?: string };

export function FindingRow({ f, style }: { f: Row; style?: React.CSSProperties }) {
  return (
    <li className="grid gap-2 px-5 py-4 md:grid-cols-[150px_1fr_auto] md:items-start md:gap-6 md:px-8" style={style}>
      <span className="t-micro flex items-center gap-2 md:pt-[3px]"><GrammarSwatch state={lineOf(f.klass)} width={28} />{KLASS_LABEL[f.klass]}</span>
      <span className="text-small">
        {f.text}
        {f.limits && <span className="mt-1 block text-[12px] text-text-muted">Limit: {f.limits}</span>}
      </span>
      <span className="text-[12px] text-text-muted md:text-right">
        {f.sourceUrl
          ? <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="block underline decoration-line/40 underline-offset-2 hover:text-text">{f.source}</a>
          : <span className="block">{f.source}</span>}
        <span className="block whitespace-nowrap font-mono">OBSERVED {f.observed} · EVENT {f.happened ?? "UNKNOWN"}</span>
      </span>
    </li>
  );
}

export type ReplayEvent = { date: string; kind: string; value: string; href?: string };

const STATE_KINDS = ["HANDLE", "DOMAIN", "CONTRACT"] as const;
const toTime = (d: string) => Date.parse(d.length === 7 ? `${d}-01` : d);

/**
 * Timeline strip with a scrubber. Dragging replays the trail: the three boxes show the
 * handle, domain and contract as they stood on that date.
 */
export function TrailReplay({ events, id = "scrub" }: { events: ReplayEvent[]; id?: string }) {
  const times = events.map((e) => toTime(e.date));
  const min = Math.min(...times), max = Math.max(...times);
  const pos = (i: number) => (max === min ? 50 : 4 + ((times[i] - min) / (max - min)) * 92);
  const [t, setT] = useState(100);
  const past = events.filter((_, i) => pos(i) <= t + 0.001);
  const current = (k: string) => [...past].reverse().find((e) => e.kind === k)?.value ?? "Not yet seen";
  const at = past[past.length - 1]?.date ?? events[0]?.date ?? "";
  if (!events.length) return null;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="t-micro text-text-muted">TRAIL REPLAY</p>
        <p className="t-micro text-text-muted">STATE AT <span className="font-mono text-text">{at}</span></p>
      </div>
      <div className="relative mt-4 h-10" aria-hidden="true">
        {events.map((e, i) => (
          <span key={`${e.date}-${i}`} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
            style={{ left: `${pos(i)}%`, opacity: pos(i) <= t + 0.001 ? 1 : 0.2 }} title={`${e.date} · ${e.value}`}>
            <span className={`block h-3 w-3 ${e.kind === "CONTRACT" ? "rotate-45 bg-accent" : e.kind === "HANDLE" ? "rounded-full border-[1.5px] border-text" : e.kind === "DOMAIN" ? "rounded-full border-[1.5px] border-dashed border-text" : "rounded-full bg-text/50"}`} />
          </span>
        ))}
      </div>
      <label className="visually-hidden" htmlFor={id}>Replay the trail by date</label>
      <input id={id} type="range" min={0} max={100} value={t} onChange={(e) => setT(+e.target.value)}
        className="scrubber" aria-valuetext={`Showing state at ${at}`} />
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        {STATE_KINDS.map((k) => (
          <div key={k} className="min-w-0 rounded-tag border hairline px-3 py-2">
            <dt className="t-micro text-text-muted">{k}</dt>
            <dd className="mt-1 truncate font-mono text-small">{current(k)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
