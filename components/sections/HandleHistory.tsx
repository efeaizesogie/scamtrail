"use client";
import { useState } from "react";
import { GrammarSwatch } from "../Connector";
import { Pin, ScrollFrame, Still } from "../Media";
import type { Evidence } from "../Node";
import { SwapIn } from "../Reveals";

type Plate = { handle: string; period: string; state: Evidence; label: string; source: string; collected: string; at: { x: number; y: number } };

/**
 * Fictional handle history. Each entry is tied to one glass plate in the photo
 * (`at` is the top edge of that plate), newest at the front.
 */
const PLATES: Plate[] = [
  { handle: "@exampleproto", period: "2025-11 to now", state: "confirmed", label: "VERIFIED", source: "X profile, current", collected: "2026-10-09", at: { x: 0.278, y: 0.13 } },
  { handle: "@exampleproto_ai", period: "2025-03 to 2025-11", state: "confirmed", label: "VERIFIED", source: "Archived profile snapshot", collected: "2026-10-09", at: { x: 0.444, y: 0.225 } },
  { handle: "@xmpl_airdrop", period: "2024-09 to 2025-03", state: "complaint", label: "OBSERVED", source: "Third-party mention log", collected: "2026-10-08", at: { x: 0.635, y: 0.215 } },
  { handle: "@xmpl_finance", period: "2024-06 to 2024-09", state: "complaint", label: "OBSERVED", source: "Quoted post in a public thread", collected: "2026-10-08", at: { x: 0.728, y: 0.245 } },
  { handle: "Before 2024-06", period: "No record", state: "unknown", label: "UNAVAILABLE", source: "No archive coverage", collected: "2026-10-09", at: { x: 0.806, y: 0.262 } },
];

export function HandleHistory() {
  const [active, setActive] = useState(0);
  const pl = PLATES[active];

  return (
    <section aria-labelledby="hh-title" className="mt-section-gap">
      <div className="page grid items-center gap-10 lg:grid-cols-[2fr_3fr] lg:gap-gutter">
        {/* Photo first on mobile */}
        <div className="order-1 lg:order-2">
          <ScrollFrame drift={10} className="aspect-[16/9]">
            <Still id="plates" sizes="(min-width: 768px) 60vw, 100vw" />
            <Pin x={pl.at.x} y={pl.at.y}>
              <SwapIn swapKey={active} className="flex flex-col items-center">
                <span className="t-micro mb-2 whitespace-nowrap rounded-tag bg-canvas/85 px-2 py-1 font-mono normal-case tracking-normal text-text">{pl.handle}</span>
                <span className={`block h-3 w-3 rounded-full ${pl.state === "confirmed" ? "bg-accent" : pl.state === "unknown" ? "border border-dashed border-text/50" : "border-[1.5px] border-text"}`} />
              </SwapIn>
            </Pin>
          </ScrollFrame>
          <p className="t-micro mt-3 text-text-muted">ILLUSTRATIVE SAMPLE DATA ONLY</p>
        </div>

        <div className="order-2 lg:order-1">
          <h2 id="hh-title" className="t-heading reveal">See every name an account has used.</h2>
          <p className="reveal mt-6 max-w-measure text-text-muted">
            Username changes are recorded with a date and a source. Where the history is partial, the report says so and never shows a partial list as a full count.
          </p>

          <ol className="reveal mt-8 border-t hairline" aria-label="Handle history, newest first">
            {PLATES.map((p, i) => (
              <li key={p.handle} className="border-b hairline">
                <button type="button" aria-pressed={active === i}
                  onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}
                  className="group flex min-h-[48px] w-full items-center gap-4 py-2 text-left transition-opacity"
                  style={{ opacity: active === i ? 1 : 0.55 + (p.state === "unknown" ? -0.1 : 0) }}>
                  <GrammarSwatch state={p.state} width={28} />
                  <span className={`min-w-0 flex-1 truncate ${p.state === "unknown" ? "text-small text-text-muted" : "font-mono text-[15px]"}`}>{p.handle}</span>
                  <span className="t-micro shrink-0 text-text-muted">{p.label}</span>
                </button>
              </li>
            ))}
          </ol>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-small" aria-live="polite">
            <div><dt className="t-micro text-text-muted">SOURCE</dt><dd className="mt-1">{pl.source}</dd></div>
            <div><dt className="t-micro text-text-muted">PERIOD</dt><dd className="mt-1 font-mono">{pl.period}</dd></div>
            <div><dt className="t-micro text-text-muted">COLLECTED</dt><dd className="mt-1 font-mono">{pl.collected}</dd></div>
            <div><dt className="t-micro text-text-muted">CLASS</dt><dd className="mt-1">{pl.label}</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}
