"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CubeVideo } from "../Cube";
import { EASE_OUT, gsap, useGSAP } from "@/lib/gsap";
import { Connector } from "../Connector";
import { NodeRing } from "../Node";
import { SearchBox, SearchState } from "../SearchBox";
import type { GlyphName } from "../Glyph";
import type { InputType } from "@/lib/detect";

/** Node rings around the cube, one per detectable input type. PROJECT lands on the cube itself. */
const RINGS: { type: Exclude<InputType, "PROJECT">; glyph: GlyphName; side: -1 | 1; x: number; y: number }[] = [
  { type: "HANDLE", glyph: "handle", side: -1, x: -270, y: -56 },
  { type: "EVM ADDRESS", glyph: "wallet", side: -1, x: -170, y: 44 },
  { type: "DOMAIN", glyph: "domain", side: 1, x: 170, y: 44 },
  { type: "CONTRACT", glyph: "contract", side: 1, x: 270, y: -56 },
];

type Geo = { d: string; fade: [number, number, number, number] } | null;

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [search, setSearch] = useState<SearchState>({ type: null, submitted: false, value: "" });
  const [geo, setGeo] = useState<Geo>(null);
  const [drawn, setDrawn] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const onChange = useCallback((s: SearchState) => setSearch(s), []);

  const measure = useCallback(() => {
    const sec = sectionRef.current, field = fieldRef.current, head = headRef.current, cube = cubeRef.current;
    if (!sec || !field || !head || !cube || !search.type) return setGeo(null);
    const o = sec.getBoundingClientRect();
    const f = field.getBoundingClientRect();
    const h = head.getBoundingClientRect();
    setBox({ w: o.width, h: o.height });

    const ring = search.type === "PROJECT" ? null : ringRefs.current[search.type];
    const target = (ring ?? cube).getBoundingClientRect();
    const side = search.type === "PROJECT" ? -1 : RINGS.find((r) => r.type === search.type)!.side;

    const sx = (side < 0 ? f.left : f.right) - o.left;
    const sy = f.top + f.height / 2 - o.top;
    const gutter = side < 0
      ? Math.max(24, Math.min(h.left, f.left) - o.left - 40)
      : Math.min(o.width - 24, Math.max(h.right, f.right) - o.left + 40);
    const tx = (side < 0 ? target.left : target.right) - o.left;
    const ty = target.top + target.height / 2 - o.top;
    const rr = 14;
    const d = [
      `M${sx},${sy}`,
      `H${gutter - side * rr}`,
      `Q${gutter},${sy} ${gutter},${sy - rr}`,
      `V${ty + rr}`,
      `Q${gutter},${ty} ${gutter + side * rr},${ty}`,
      `H${tx}`,
    ].join(" ");
    setGeo({ d, fade: [sx, sy, tx, ty] });
  }, [search.type]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Redraw the connector from zero whenever the route changes.
  useEffect(() => {
    setDrawn(false);
    if (!search.type) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(r);
  }, [search.type]);

  const exitRef = useRef<HTMLDivElement>(null);
  const cubeLayerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(sectionRef);
      // Intro: nav, then the cube arrives, the headline rises word by word, the rest follows.
      const tl = gsap.timeline({ defaults: { ease: EASE_OUT }, onComplete: () => document.documentElement.classList.remove("intro") });
      tl.fromTo("header[data-intro]", { autoAlpha: 0, y: -18 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0)
        .fromTo(q("[data-intro=cube]"), { autoAlpha: 0, y: 30, scale: 0.88 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.8 }, 0.1)
        .set(q("[data-intro=title]"), { autoAlpha: 1 }, 0.3)
        .fromTo(q(".hero-word"), { yPercent: 115 }, { yPercent: 0, duration: 1.3, stagger: 0.08 }, 0.3)
        .fromTo(q("[data-intro=rings]"), { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 1.4 }, 0.75)
        .fromTo(q("[data-intro=body]"), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.75)
        .fromTo(q("[data-intro=search]"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.9)
        .fromTo(q("[data-intro=search] li"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06 }, 1.05)
        .fromTo(q("[data-intro=micro], [data-intro=cue]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, stagger: 0.15 }, 1.3);

      // Exit: as the page scrolls away the hero lifts and fades; the cube drifts slower (parallax).
      gsap.to(exitRef.current, { y: -48, opacity: 0.15, ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "+=85%", scrub: 0.6 } });
      gsap.to(cubeLayerRef.current, { y: 36, scale: 0.92, ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "+=85%", scrub: 0.6 } });
    });
  }, { scope: sectionRef });

  const active = search.type;

  return (
    <section id="top" ref={sectionRef} aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* Edge constellation: low-opacity rings joined by dashed connectors */}
      <svg className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full opacity-40 lg:block" preserveAspectRatio="none" viewBox="0 0 1440 900" aria-hidden="true">
        <path d="M70 250 L170 340 L120 470" className="ev-complaint" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M1370 220 L1280 330 L1350 450" className="ev-complaint" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M120 470 L60 600" className="ev-unverified" fill="none" vectorEffect="non-scaling-stroke" />
        {[[70, 250], [170, 340], [120, 470], [1370, 220], [1280, 330], [1350, 450]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={6} fill="#0b0b0b" stroke="rgb(255 255 255 / 0.55)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      <div ref={exitRef} className="relative flex flex-1 flex-col will-change-transform">
      {/* Field-to-cube connector */}
      {geo && active && (
        <svg className="pointer-events-none absolute inset-0 z-10 hidden md:block" width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden="true">
          <Connector key={active} d={geo.d} state={search.submitted ? "confirmed" : "complaint"} progress={drawn ? 1 : 0} ease={800} fade={geo.fade} />
        </svg>
      )}

      <div className="page relative flex flex-1 flex-col items-center justify-center pb-28 pt-28 text-center md:pt-32">
        {/* Cube above the headline, with the type rings around it */}
        <div className="relative mb-6 h-[180px] w-full max-w-[640px] md:mb-8 md:h-[220px]">
          <div ref={cubeLayerRef} className="absolute inset-0">
            <div ref={cubeRef} data-intro="cube" className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 md:h-[200px] md:w-[200px]">
              <CubeVideo size={200} priority className="!h-full !w-full" />
            </div>
          </div>
          <div data-intro="rings" className="absolute inset-0">
          {RINGS.map((r) => {
            const on = active === r.type;
            return (
              <span key={r.type} ref={(el) => { ringRefs.current[r.type] = el; }}
                className="absolute left-1/2 top-1/2 hidden transition-opacity duration-500 md:block"
                style={{ transform: `translate(calc(-50% + ${r.x}px), calc(-50% + ${r.y}px))`, opacity: on ? 1 : 0.45 }}>
                <NodeRing glyph={r.glyph} state={on && search.submitted ? "confirmed" : on ? "credible" : "unverified"} />
                <span className={`t-micro absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap ${on ? "text-text" : "text-text-muted"}`}>
                  {r.type}
                </span>
              </span>
            );
          })}
          </div>
        </div>

        <div ref={headRef} className="max-w-[920px]">
          <h1 id="hero-title" data-intro="title" className="t-display" aria-label="Investigate before you trust.">
            {"Investigate before you trust.".split(" ").map((w, i, all) => (
              <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.06em] align-bottom">
                <span className="hero-word inline-block">{w}{i < all.length - 1 ? " " : ""}</span>
              </span>
            ))}
          </h1>
          <p data-intro="body" className="mx-auto mt-6 max-w-measure text-body text-text-muted">
            Search a project, X handle, wallet or contract. See what the evidence says and what it leaves open.
          </p>
        </div>

        <div className="mt-10 w-full max-w-[680px]">
          <div data-intro="search">
            <SearchBox ref={fieldRef} onChange={onChange} showChips />
          </div>
          <p data-intro="micro" className="t-micro mt-6 text-text-muted">NO ACCOUNT REQUIRED · SOURCES SHOWN · LIMITS STATED</p>
        </div>
      </div>
      </div>

      {/* Scroll cue */}
      <a href="#walk" data-intro="cue" className="absolute bottom-6 left-1/2 flex h-16 w-11 -translate-x-1/2 justify-center" aria-label="Scroll to the next section">
        <span className="relative block h-16 w-px bg-line/30">
          <span className="scroll-cue-dot absolute -left-[2.5px] top-0 block h-[6px] w-[6px] rounded-full bg-accent" />
        </span>
      </a>
    </section>
  );
}
