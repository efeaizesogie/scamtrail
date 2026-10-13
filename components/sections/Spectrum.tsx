"use client";
import { useRef } from "react";
import { GrammarSwatch } from "../Connector";
import { Camera, Cover, shotAt, Shot, Still } from "../Media";
import type { Evidence } from "../Node";
import { span, useScrollProgress, useScrollScenes } from "@/lib/hooks";
import { SwapIn } from "../Reveals";

type Sheet = { label: string; text: string; state: Evidence; shot: Shot };

/**
 * One sheet on the light table per evidence class. The camera walks along the
 * table from the brightest sheet to the faintest. Shots are in photo fractions.
 */
const SHEETS: Sheet[] = [
  { label: "CONFIRMED INCIDENT", text: "Backed by an on-chain record or a court filing.", state: "confirmed", shot: { x: 0.26, y: 0.55, s: 1.75 } },
  { label: "CREDIBLE ALLEGATION", text: "Raised by a named source with evidence that no one has independently confirmed yet.", state: "credible", shot: { x: 0.52, y: 0.47, s: 1.8 } },
  { label: "COMMUNITY COMPLAINT", text: "Reported by users in public channels. Logged and dated, and kept apart from findings.", state: "complaint", shot: { x: 0.7, y: 0.4, s: 1.9 } },
  { label: "UNVERIFIED CLAIM", text: "A statement with no supporting source. Shown so you can check it yourself.", state: "unverified", shot: { x: 0.86, y: 0.34, s: 2 } },
  { label: "MISATTRIBUTED RESULT", text: "A match on the name that belongs to a different project. Flagged and set aside.", state: "unknown", shot: { x: 0.96, y: 0.3, s: 2.1 } },
];

const MAX_ZOOM = Math.max(...SHEETS.map((sh) => sh.shot.s));

function Rule({ active }: { active: number }) {
  return (
    <ol className="grid grid-cols-5 gap-4" aria-label="Evidence classes">
      {SHEETS.map((s, i) => (
        <li key={s.label} className="relative pt-5" aria-current={i === active ? "step" : undefined}>
          <span className={`absolute left-0 top-0 h-[2px] w-full transition-colors duration-500 ${i <= active ? "bg-accent" : "bg-line/20"}`} aria-hidden="true" />
          <span className={`flex items-center gap-2 transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-50"}`}>
            <GrammarSwatch state={s.state} width={22} />
            <span className="t-label">{s.label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Spectrum() {
  const ref = useRef<HTMLElement>(null);
  const scenes = useScrollScenes();
  const p = useScrollProgress(ref, "pin", scenes);
  const { shot, stop } = shotAt(SHEETS.map((s) => s.shot), span(p, 0.05, 0.92), 0.5);

  const heading = (
    <>
      <h2 id="sp-title" className="t-display reveal [text-wrap:balance]">Allegations are<br />not findings.</h2>
      <p className="reveal mt-5 max-w-measure text-text-muted">Five classes of evidence, each labeled, dated and linked to its source.</p>
    </>
  );

  if (!scenes) {
    return (
      <section aria-labelledby="sp-title" className="mt-section-gap">
        <div className="page">
          {heading}
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-media">
            <Still id="lighttable" sizes="100vw" />
          </div>
          <ol className="mt-10 space-y-6">
            {SHEETS.map((s) => (
              <li key={s.label} className="reveal flex gap-4">
                <span className="mt-[5px]"><GrammarSwatch state={s.state} width={28} /></span>
                <span>
                  <span className="t-label block">{s.label}</span>
                  <span className="mt-1 block text-small text-text-muted">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} aria-labelledby="sp-title" className="relative mt-section-gap h-[360vh]">
      <div className="sticky top-0 flex h-screen flex-col pb-8 pt-24">
        <div className="page">{heading}</div>
        <div className="mx-auto mt-8 w-full max-w-[1440px] flex-1 px-4 md:px-10">
          <div className="relative h-full overflow-hidden rounded-media">
            <Cover focus={shot}>
              <Camera shot={shot} max={MAX_ZOOM}>
                <Still id="lighttable" sizes="300vw" />
              </Camera>
            </Cover>
          </div>
        </div>
        <div className="page mt-6">
          <Rule active={stop} />
          <div aria-live="polite"><SwapIn as="p" swapKey={stop} className="mt-3 max-w-[640px] text-small text-text-muted">{SHEETS[stop].text}</SwapIn></div>
        </div>
      </div>
    </section>
  );
}
