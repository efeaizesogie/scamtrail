"use client";
import { useRef } from "react";
import { CubeRender } from "../Cube";
import { PixelGlyph } from "../Glyph";
import type { Evidence } from "../Node";
import { useInView } from "@/lib/hooks";
import { CoverageLegend, CoverageRing, FindingRow, TrailReplay } from "../report/parts";
import { EASE_OUT, gsap, useGSAP } from "@/lib/gsap";

/* All data below is illustrative. No real project, account or address is referenced. */
const COVERAGE = [
  { label: "SOCIAL", ran: 1, total: 1 },
  { label: "ON-CHAIN", ran: 1, total: 1 },
  { label: "WEBSITE", ran: 1, total: 1 },
  { label: "REPORTS", ran: 0, total: 1 },
];

const FINDINGS: { state: Evidence; text: string; source: string; observed: string; happened: string }[] = [
  { state: "confirmed", text: "Liquidity removed from the main pool 13 days after launch.", source: "Block explorer", observed: "2026-10-09", happened: "2025-12-02" },
  { state: "credible", text: "Security researcher links the deployer to an earlier token.", source: "Researcher post", observed: "2026-10-09", happened: "2025-12-05" },
  { state: "complaint", text: "Users report delayed withdrawals from the staking page.", source: "Public forum thread", observed: "2026-10-08", happened: "2026-01-14" },
  { state: "unverified", text: "Claim that the team is based in a named city.", source: "Anonymous reply", observed: "2026-10-08", happened: "Unknown" },
  { state: "unknown", text: "Audit status. No audit report could be located or ruled out.", source: "No source returned", observed: "2026-10-09", happened: "Unknown" },
];

const EVENTS: { date: string; kind: "HANDLE" | "DOMAIN" | "CONTRACT"; value: string }[] = [
  { date: "2024-06", kind: "HANDLE", value: "@xmpl_finance" },
  { date: "2024-08", kind: "DOMAIN", value: "xmpl-finance.example" },
  { date: "2024-09", kind: "HANDLE", value: "@xmpl_airdrop" },
  { date: "2025-03", kind: "HANDLE", value: "@exampleproto_ai" },
  { date: "2025-04", kind: "DOMAIN", value: "exampleproto.example" },
  { date: "2025-11", kind: "CONTRACT", value: "0x5e1a…c0de" },
  { date: "2025-11", kind: "HANDLE", value: "@exampleproto" },
  { date: "2025-12", kind: "DOMAIN", value: "app.example.com" },
];

/** 3 to 4 tilted cube renders clustered at one edge of the band, partly cropped by it. */
function CubeCluster({ side }: { side: "left" | "right" }) {
  const cubes = side === "left"
    ? [{ s: 132, x: "-46px", y: "8%", r: -14 }, { s: 64, x: "78px", y: "34%", r: 22 }, { s: 44, x: "22px", y: "52%", r: -32 }, { s: 104, x: "-30px", y: "70%", r: 9 }]
    : [{ s: 112, x: "-38px", y: "14%", r: 17 }, { s: 54, x: "70px", y: "40%", r: -24 }, { s: 148, x: "-58px", y: "62%", r: -7 }];
  return (
    <div className="pointer-events-none absolute inset-y-0 hidden w-[200px] lg:block" style={{ [side]: 0 }} aria-hidden="true">
      {cubes.map((c, i) => (
        <div key={i} className="reveal absolute" style={{ top: c.y, [side]: c.x }}>
          <CubeRender size={c.s} variant="solid" rotate={c.r} />
        </div>
      ))}
    </div>
  );
}

export function Report() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, 0.2);

  // The mock-up builds itself: header, summary, each finding, then the timeline.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(ref);
      const parts = [...q(":scope > *")].flatMap((el) => (el.tagName === "UL" ? [...el.children] : [el]));
      gsap.set(parts, { autoAlpha: 0, y: 22 });
      gsap.to(parts, { autoAlpha: 1, y: 0, duration: 1, ease: EASE_OUT, stagger: 0.1,
        scrollTrigger: { trigger: ref.current, start: "top 78%", once: true } });
    });
  }, { scope: ref });

  return (
    <section id="report" data-theme="light" aria-labelledby="rp-title" className="relative mt-section-gap overflow-hidden bg-canvas py-section-gap text-text">
      <CubeCluster side="left" />
      <CubeCluster side="right" />

      <div className="page relative text-center">
        <h2 id="rp-title" className="t-display reveal [text-wrap:balance]">One report.<br />Every source linked.</h2>
        <p className="reveal mx-auto mt-6 max-w-measure text-text-muted">
          Each finding carries its source, the date it was observed, the date the event happened, and the limits of the check.
        </p>
      </div>

      {/* Report mockup: flat on cream, no shadow */}
      <div className="page relative mt-14">
        <div ref={ref} className="mx-auto max-w-[980px] rounded-card border hairline-strong bg-canvas text-left"
          role="group" aria-label="Illustrative sample report">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline px-5 py-4 md:px-8">
            <span className="font-mono text-small">ST-2026-004217</span>
            <span className="t-micro rounded-tag border hairline-strong px-2 py-1">ILLUSTRATIVE SAMPLE DATA ONLY</span>
          </div>

          <div className="grid gap-8 border-b hairline px-5 py-6 md:grid-cols-[1fr_auto] md:px-8">
            <div>
              <p className="t-micro text-text-muted">PROJECT</p>
              <p className="t-heading-sm mt-2">EXAMPLE PROTOCOL</p>
              <p className="mt-2 text-small text-text-muted">Report generated 2026-10-09. Reports check not run, so complaint coverage is incomplete.</p>
            </div>
            <div className="flex items-center gap-5">
              <CoverageRing segments={COVERAGE} on={on} />
              <CoverageLegend segments={COVERAGE} />
            </div>
          </div>

          <ul className="divide-y divide-line/10 border-b hairline" aria-label="Findings">
            {FINDINGS.map((f, i) => (
              <FindingRow key={i} f={{ klass: f.state, text: f.text, source: f.source, observed: f.observed, happened: f.happened }} />
            ))}
          </ul>

          {/* Timeline strip with trail replay */}
          <div className="px-5 py-6 md:px-8">
            <TrailReplay events={EVENTS} />
          </div>
        </div>

        <div className="mt-10 text-center">
          <a href="#report" className="btn-primary">
            <PixelGlyph />
            VIEW A SAMPLE REPORT
          </a>
        </div>
      </div>
    </section>
  );
}
