"use client";
import { useEffect, useRef, useState } from "react";
import { NodeRing } from "../Node";
import { Still } from "../Media";
import type { GlyphName } from "../Glyph";
import type { ImageId } from "@/lib/images";
import { span, useScrollProgress, useScrollScenes } from "@/lib/hooks";
import { EASE_OUT, gsap } from "@/lib/gsap";

/** Three steps, each with its own photo. */
const STEPS: { image: ImageId; glyph: GlyphName; title: string; text: string }[] = [
  { image: "search", glyph: "search", title: "SEARCH", text: "Enter a handle, address, domain or project name. Confirm which project you mean." },
  { image: "trace", glyph: "trace", title: "TRACE", text: "ScamTrail checks profiles, reports, contracts and websites, and shows progress per source." },
  { image: "decide", glyph: "decide", title: "DECIDE", text: "Read the findings, open the sources, and note what is missing." },
];

function Card({ step, index, active }: { step: (typeof STEPS)[number]; index: number; active: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const tween = gsap.to(ref.current, { opacity: active ? 1 : 0.42, scale: active ? 1 : 0.965, duration: 0.9, ease: EASE_OUT });
    return () => { tween.kill(); };
  }, [active]);
  return (
    <article ref={ref} className="w-full shrink-0 overflow-hidden rounded-media bg-canvas md:w-[min(74vw,880px,calc((100vh-340px)*16/9))]"
      aria-label={`Step ${index + 1}: ${step.title}`}>
      <div className="relative aspect-[16/9] overflow-hidden">
        <Still id={step.image} sizes="(min-width: 768px) 74vw, 100vw" />
      </div>
      <div className="flex items-start gap-4 p-6 md:p-7">
        <NodeRing glyph={step.glyph} state={active ? "confirmed" : "credible"} />
        <div>
          <p className="t-label">0{index + 1} · {step.title}</p>
          <p className="mt-2 max-w-measure text-text-muted">{step.text}</p>
        </div>
      </div>
    </article>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scenes = useScrollScenes();
  const p = useScrollProgress(ref, "pin", scenes);
  const [travel, setTravel] = useState(0);

  useEffect(() => {
    if (!scenes) return;
    const measure = () => {
      const t = trackRef.current;
      if (t) setTravel(Math.max(0, t.scrollWidth - t.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [scenes]);

  const move = span(p, 0.08, 0.92);
  const active = scenes ? Math.round(move * (STEPS.length - 1)) : -1;

  const header = (
    <div className="page flex items-end justify-between gap-8">
      <div>
        <p className="t-micro text-text-muted">HOW IT WORKS</p>
        <h2 id="how-title" className="t-heading mt-3">Three steps, each with its sources open.</h2>
      </div>
      {scenes && (
        <svg width="160" height="12" viewBox="0 0 160 12" className="mb-3 hidden shrink-0 md:block" aria-hidden="true">
          <line x1="6" y1="6" x2="154" y2="6" className="ev-complaint" />
          <line x1="6" y1="6" x2={6 + move * 148} y2="6" className="ev-confirmed" />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={6 + i * 74} cy="6" r="5" fill={i <= active ? "rgb(var(--accent))" : "rgb(var(--surface-raised))"}
              stroke={i <= active ? "rgb(var(--accent))" : "rgb(var(--node-ring) / 0.5)"} strokeWidth="1.5" />
          ))}
        </svg>
      )}
    </div>
  );

  if (!scenes) {
    return (
      <section id="how" aria-labelledby="how-title" className="mt-section-gap bg-surface-raised py-section-gap">
        {header}
        <div className="page mt-10 space-y-6">
          {STEPS.map((s, i) => <div key={s.title} className="reveal"><Card step={s} index={i} active /></div>)}
        </div>
      </section>
    );
  }

  return (
    <section id="how" ref={ref} aria-labelledby="how-title" className="relative mt-section-gap h-[300vh] bg-surface-raised">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden py-16">
        {header}
        <div ref={trackRef} className="mt-10 overflow-hidden">
          <div className="flex gap-8 px-[max(16px,calc((100vw-1280px)/2+40px))] will-change-transform"
            style={{ transform: `translateX(${-move * travel}px)` }}>
            {STEPS.map((s, i) => <Card key={s.title} step={s} index={i} active={i === active} />)}
            <div aria-hidden="true" className="w-px shrink-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
