"use client";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { Cover } from "../Media";
import { GradedVideo } from "../Motion";
import { IMAGES } from "@/lib/images";
import { span, useInView, useScrollProgress, useScrollScenes } from "@/lib/hooks";

/**
 * The stones after the first one, in photo fractions. The photo already lights
 * the nearest stone; these three catch the light in turn. The far stones never do.
 */
const NEXT_STONES = [
  { x: 0.432, y: 0.694, r: 0.066, k: 0.55 },
  { x: 0.541, y: 0.629, r: 0.05, k: 0.38 },
  { x: 0.466, y: 0.585, r: 0.043, k: 0.22 },
];

export function Fog() {
  const ref = useRef<HTMLElement>(null);
  const scenes = useScrollScenes();
  const p = useScrollProgress(ref, "through", scenes);
  const seen = useInView(ref, 0.3);
  const lit = scenes ? Math.floor(span(p, 0.38, 0.62) * 3.999) : seen ? 3 : 0;
  const settle = scenes ? 1.12 - span(p, 0, 0.6) * 0.12 : 1;
  const mistY = scenes ? (0.5 - p) * 120 * 0.3 : 0;

  // Each stone catches the light in turn; going back up, they dim again.
  const stoneRefs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    stoneRefs.current.forEach((el, i) => {
      if (el) gsap.to(el, { opacity: i < lit ? NEXT_STONES[i].k : 0, scale: i < lit ? 1 : 0.85, duration: 1.4, ease: "sine.out", overwrite: true });
    });
  }, [lit]);

  return (
    <section ref={ref} aria-labelledby="fog-title" className="relative isolate mt-section-gap flex min-h-[115vh] items-start overflow-hidden">
      <Cover className="-z-10">
        <div className="absolute inset-0" style={{ transform: `scale(${settle})`, transformOrigin: "50% 80%" }}>
          <GradedVideo src="/video/fog.mp4" poster="/images/fog-poster.webp" alt={IMAGES.fog.alt} gamma={1.45} gain={0.72} sizes="100vw" />
          {NEXT_STONES.map((s, i) => (
            <span key={i} ref={(el) => { stoneRefs.current[i] = el; }} aria-hidden="true" className="absolute rounded-[50%] mix-blend-screen"
              style={{
                left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.r * 200}%`, height: `${s.r * 70}%`,
                translate: "-50% -50%",
                background: "radial-gradient(closest-side, rgb(229 255 93 / 0.55), rgb(229 255 93 / 0.12) 55%, transparent)",
                opacity: 0,
              }} />
          ))}
        </div>
      </Cover>

      {/* Mist at 0.3x scroll speed plus a slow drift loop */}
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ transform: `translateY(${mistY}px)` }} aria-hidden="true">
        <div className="mist absolute -inset-x-[10%] top-[38%] h-[34%] rounded-[50%] bg-[#3a3a3a] opacity-30 blur-[80px]" />
        <div className="mist slow absolute -inset-x-[10%] top-[52%] h-[22%] rounded-[50%] bg-[#444] opacity-20 blur-[60px]" />
      </div>

      <div className="page relative pb-32 pt-[16vh] text-center">
        <h2 id="fog-title" className="t-display reveal mx-auto max-w-[1000px] [text-wrap:balance]">No reports found is not the same as safe.</h2>
        <p className="reveal mx-auto mt-8 max-w-measure text-text-muted">
          ScamTrail reports what the sources returned, what could not be checked, and what stays unknown.
        </p>
      </div>
    </section>
  );
}
